<?php

namespace App\Http\Controllers\Api;

use App\Enums\Availability;
use App\Enums\EmploymentType;
use App\Enums\ReportCategory;
use App\Http\Controllers\Controller;
use App\Models\Location;
use App\Models\Skill;
use App\Services\Payments\PaymentService;
use Illuminate\Http\JsonResponse;

class MetaController extends Controller
{
    /** Skills, locations, enums — everything the frontend needs to render filters/forms. */
    public function index(PaymentService $payments): JsonResponse
    {
        return response()->json([
            'skills' => Skill::query()->where('active', true)->where('category', 'helper')->get(['id', 'name', 'slug']),
            'job_categories' => Skill::query()->where('active', true)->where('category', 'job')->get(['id', 'name', 'slug']),
            'states' => Location::query()->where('active', true)->distinct()->orderBy('state')->pluck('state'),
            'cities' => Location::query()->where('active', true)->orderBy('state')->orderBy('city')
                ->get(['state', 'city'])->groupBy('state'),
            'availability' => collect(Availability::cases())->map(fn ($a) => ['value' => $a->value, 'label' => $a->label()]),
            'employment_types' => collect(EmploymentType::cases())->map(fn ($e) => ['value' => $e->value, 'label' => $e->label()]),
            'report_categories' => collect(ReportCategory::cases())->map(fn ($c) => ['value' => $c->value, 'label' => $c->label()]),
            'payment_provider' => $payments->defaultProvider(),
            'verification_report_price' => (int) \App\Models\Setting::getValue('verification_report_price', 5000),
        ]);
    }
}
