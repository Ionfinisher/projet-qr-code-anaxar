<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Exceptions\QrScanException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\ScanRequest;
use App\Services\QrScanService;
use Illuminate\Http\JsonResponse;

class ScanController extends Controller
{
    public function __construct(private readonly QrScanService $scan) {}

    public function scan(ScanRequest $request): JsonResponse
    {
        try {
            return response()->json($this->scan->dossier((string) $request->validated('token')));
        } catch (QrScanException $exception) {
            $body = ['message' => $exception->getMessage()];

            if ($exception->reason !== null) {
                $body['reason'] = $exception->reason;
            }

            return response()->json($body, $exception->status);
        }
    }
}
