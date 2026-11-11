<?php

namespace App\Http\Controllers;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Proxy serveur vers Google Places API (New) — Autocomplete.
 *
 * La clé Google reste dans la configuration du serveur : elle n'est jamais
 * transmise au navigateur. Les résultats sont filtrés sur le pays choisi et
 * mis en cache pour limiter le coût et absorber les pics de frappe.
 */
class PlaceAutocompleteController extends Controller
{
    private const MIN_QUERY_LENGTH = 2;

    private const CACHE_TTL_HOURS = 24;

    private const FIELD_MASK = 'suggestions.placePrediction.placeId,'
        .'suggestions.placePrediction.text.text,'
        .'suggestions.placePrediction.structuredFormat';

    /** Villes uniquement (collection Google dédiée). */
    private const CITY_TYPES = ['(cities)'];

    /**
     * Adresses : types recommandés par Google pour l'autocomplétion d'adresse.
     * `plus_code` couvre les zones où les adresses numérotées sont rares.
     */
    private const ADDRESS_TYPES = ['street_address', 'premise', 'subpremise', 'route', 'plus_code'];

    public function cities(Request $request): JsonResponse
    {
        return $this->respond($request, 'city', self::CITY_TYPES);
    }

    public function addresses(Request $request): JsonResponse
    {
        return $this->respond($request, 'address', self::ADDRESS_TYPES);
    }

    /**
     * @param  array<int, string>  $primaryTypes
     */
    private function respond(Request $request, string $kind, array $primaryTypes): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['required', 'string', 'min:'.self::MIN_QUERY_LENGTH, 'max:120'],
            'country' => ['nullable', 'string', 'size:2', 'alpha'],
        ]);

        $query = trim($validated['q']);
        if (mb_strlen($query) < self::MIN_QUERY_LENGTH) {
            return response()->json(['suggestions' => []]);
        }

        $key = trim((string) config('services.google_places.key'));
        if ($key === '') {
            return response()->json([
                'suggestions' => [],
                'available' => false,
            ], 503);
        }

        // « XX » (pays « Autre » du seeder) n'est pas un code ISO exploitable.
        $country = strtolower((string) ($validated['country'] ?? ''));
        if ($country === 'xx') {
            $country = '';
        }

        $cacheKey = 'places:'.$kind.':'.sha1(mb_strtolower($query).'|'.$country);

        $cached = Cache::get($cacheKey);
        if (is_array($cached)) {
            return response()->json(['suggestions' => $cached]);
        }

        $suggestions = $this->fetchSuggestions($query, $country, $key, $primaryTypes);

        // On ne met en cache que les réponses exploitables : une panne passagère
        // de Google ne doit pas figer un résultat vide pendant 24 h.
        if ($suggestions !== null) {
            Cache::put($cacheKey, $suggestions, now()->addHours(self::CACHE_TTL_HOURS));
        }

        return response()->json(['suggestions' => $suggestions ?? []]);
    }

    /**
     * Retourne les suggestions normalisées, ou null en cas d'échec
     * (réseau, quota, configuration) pour ne pas empoisonner le cache.
     *
     * @param  array<int, string>  $primaryTypes
     * @return array<int, array{place_id: ?string, label: string, main: string, secondary: ?string}>|null
     */
    private function fetchSuggestions(string $query, string $country, string $key, array $primaryTypes): ?array
    {
        $payload = [
            'input' => $query,
            'languageCode' => 'fr',
            'includedPrimaryTypes' => $primaryTypes,
        ];

        if ($country !== '') {
            $payload['includedRegionCodes'] = [$country];
            $payload['regionCode'] = $country;
        }

        try {
            $response = Http::withHeaders([
                'X-Goog-Api-Key' => $key,
                'X-Goog-FieldMask' => self::FIELD_MASK,
            ])
                ->acceptJson()
                ->asJson()
                ->timeout((int) config('services.google_places.timeout', 5))
                ->post((string) config('services.google_places.endpoint'), $payload);
        } catch (ConnectionException) {
            Log::warning('Google Places autocomplete injoignable.');

            return null;
        }

        if (! $response->successful()) {
            // On ne journalise ni la clé ni le corps de la requête utilisateur.
            Log::warning('Google Places autocomplete en échec.', [
                'status' => $response->status(),
            ]);

            return null;
        }

        $suggestions = $response->json('suggestions');
        if (! is_array($suggestions)) {
            return [];
        }

        return collect($suggestions)
            ->map(function ($suggestion): ?array {
                $prediction = is_array($suggestion) ? ($suggestion['placePrediction'] ?? null) : null;
                if (! is_array($prediction)) {
                    return null;
                }

                $label = $prediction['text']['text'] ?? null;
                if (! is_string($label) || $label === '') {
                    return null;
                }

                $main = $prediction['structuredFormat']['mainText']['text'] ?? $label;
                $secondary = $prediction['structuredFormat']['secondaryText']['text'] ?? null;

                return [
                    'place_id' => $prediction['placeId'] ?? null,
                    'label' => $label,
                    'main' => $main,
                    'secondary' => is_string($secondary) && $secondary !== '' ? $secondary : null,
                ];
            })
            ->filter()
            ->values()
            ->all();
    }
}
