<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PlaceAutocompleteTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Cache::flush();
        config()->set('services.google_places.key', 'test-key');
        config()->set('services.google_places.endpoint', 'https://places.googleapis.com/v1/places:autocomplete');
        config()->set('services.google_places.timeout', 5);
    }

    public function test_it_returns_city_suggestions_for_the_selected_country(): void
    {
        Http::fake([
            'places.googleapis.com/*' => Http::response([
                'suggestions' => [
                    [
                        'placePrediction' => [
                            'placeId' => 'place-abc',
                            'text' => ['text' => 'Lomé, Togo'],
                            'structuredFormat' => [
                                'mainText' => ['text' => 'Lomé'],
                                'secondaryText' => ['text' => 'Togo'],
                            ],
                        ],
                    ],
                ],
            ]),
        ]);

        $response = $this->getJson('/api/places/cities?q=Lom&country=TG');

        $response->assertOk()->assertExactJson([
            'suggestions' => [
                [
                    'place_id' => 'place-abc',
                    'label' => 'Lomé, Togo',
                    'main' => 'Lomé',
                    'secondary' => 'Togo',
                ],
            ],
        ]);

        Http::assertSent(function ($request) {
            return $request->url() === 'https://places.googleapis.com/v1/places:autocomplete'
                && $request['input'] === 'Lom'
                && $request['includedRegionCodes'] === ['tg']
                && $request['regionCode'] === 'tg'
                && $request['includedPrimaryTypes'] === ['(cities)']
                && $request['languageCode'] === 'fr'
                && $request->hasHeader('X-Goog-Api-Key', 'test-key');
        });
    }

    public function test_it_rejects_a_query_that_is_too_short(): void
    {
        Http::preventStrayRequests();

        $this->getJson('/api/places/cities?q=L&country=TG')->assertStatus(422);
    }

    public function test_it_rejects_an_invalid_country_code(): void
    {
        Http::preventStrayRequests();

        $this->getJson('/api/places/cities?q=Lom&country=TGO')->assertStatus(422);
    }

    public function test_it_returns_an_empty_list_when_the_api_key_is_missing(): void
    {
        config()->set('services.google_places.key', null);
        Http::preventStrayRequests();

        $this->getJson('/api/places/cities?q=Lom&country=TG')
            ->assertStatus(503)
            ->assertExactJson(['suggestions' => [], 'available' => false]);
    }

    public function test_it_degrades_gracefully_when_google_fails(): void
    {
        Http::fake([
            'places.googleapis.com/*' => Http::response(['error' => 'quota exceeded'], 500),
        ]);

        $response = $this->getJson('/api/places/cities?q=Lom&country=TG');

        $response->assertOk()->assertExactJson(['suggestions' => []]);
        $this->assertStringNotContainsString('quota exceeded', (string) $response->getContent());
    }

    public function test_it_omits_the_region_restriction_for_the_unknown_country(): void
    {
        Http::fake([
            'places.googleapis.com/*' => Http::response(['suggestions' => []]),
        ]);

        $this->getJson('/api/places/cities?q=Lom&country=XX')->assertOk();

        Http::assertSent(function ($request) {
            return ! isset($request['includedRegionCodes'])
                && ! isset($request['regionCode']);
        });
    }

    public function test_it_caches_identical_queries(): void
    {
        Http::fake([
            'places.googleapis.com/*' => Http::response(['suggestions' => []]),
        ]);

        $this->getJson('/api/places/cities?q=Lom&country=TG')->assertOk();
        $this->getJson('/api/places/cities?q=lom&country=tg')->assertOk();

        Http::assertSentCount(1);
    }

    public function test_it_returns_address_suggestions_with_address_primary_types(): void
    {
        Http::fake([
            'places.googleapis.com/*' => Http::response([
                'suggestions' => [
                    [
                        'placePrediction' => [
                            'placeId' => 'address-abc',
                            'text' => ['text' => 'Boulevard du Mono, Lomé, Togo'],
                            'structuredFormat' => [
                                'mainText' => ['text' => 'Boulevard du Mono'],
                                'secondaryText' => ['text' => 'Lomé, Togo'],
                            ],
                        ],
                    ],
                ],
            ]),
        ]);

        $response = $this->getJson('/api/places/addresses?q=Boulevard&country=TG');

        $response->assertOk()->assertExactJson([
            'suggestions' => [
                [
                    'place_id' => 'address-abc',
                    'label' => 'Boulevard du Mono, Lomé, Togo',
                    'main' => 'Boulevard du Mono',
                    'secondary' => 'Lomé, Togo',
                ],
            ],
        ]);

        Http::assertSent(function ($request) {
            return $request->url() === 'https://places.googleapis.com/v1/places:autocomplete'
                && $request['input'] === 'Boulevard'
                && $request['includedRegionCodes'] === ['tg']
                && $request['includedPrimaryTypes'] === [
                    'street_address',
                    'premise',
                    'subpremise',
                    'route',
                    'plus_code',
                ];
        });
    }

    public function test_city_and_address_caches_are_independent(): void
    {
        Http::fake([
            'places.googleapis.com/*' => Http::response(['suggestions' => []]),
        ]);

        $this->getJson('/api/places/cities?q=Lom&country=TG')->assertOk();
        $this->getJson('/api/places/addresses?q=Lom&country=TG')->assertOk();

        Http::assertSentCount(2);
    }
}
