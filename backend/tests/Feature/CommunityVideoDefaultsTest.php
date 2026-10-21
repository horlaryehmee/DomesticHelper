<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CommunityVideoDefaultsTest extends TestCase
{
    use RefreshDatabase;

    public function test_platform_reels_are_published_with_local_video_files(): void
    {
        $response = $this->getJson('/api/community-experiences')->assertOk();

        foreach (['DeNSx_IsKho', 'DePLFV-sGHY'] as $code) {
            $item = collect($response->json('data'))->first(fn ($item) => str_contains($item['source_url'] ?? '', $code));
            $this->assertNotNull($item);
            $this->assertSame('video', $item['content_type']);
            $this->assertSame('/community-media/'.$code.'.mp4', $item['media_url']);
            $this->assertSame('/community-media/'.$code.'.jpg', $item['poster_url']);
        }
    }
}
