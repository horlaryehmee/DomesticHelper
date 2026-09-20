<?php

namespace Database\Seeders;

use App\Models\CommunityExperience;
use Illuminate\Database\Seeder;

class CommunityExperienceSeeder extends Seeder
{
    public function run(): void
    {
        $sources = [
            [
                'url' => 'https://www.instagram.com/reel/DdcFytnMs4E/',
                'title' => 'Community safety story',
                'description' => 'A community-sourced video shared to help households and domestic workers learn from real experiences. Watch the original reel for the full account and context.',
            ],
            [
                'url' => 'https://www.instagram.com/reel/DdcVDoRMYkG/?stkn=djJwemt3bW8wMWx5',
                'title' => 'Community-sourced experience',
                'description' => 'An Instagram reel shared as part of the community experience library. Watch the original source for the complete account and context.',
            ],
            [
                'url' => 'https://www.instagram.com/reel/DdWfwH-MJLm/?stkn=aTF3MjNjczQyM3d2',
                'title' => 'Community-sourced experience',
                'description' => 'An Instagram reel shared as part of the community experience library. Watch the original source for the complete account and context.',
            ],
            [
                'url' => 'https://www.instagram.com/p/DaDI3AgDQXU/?img_index=1&igsh=MTJ0b25rdXdrZHpxZQ==',
                'title' => 'Community-sourced Instagram post',
                'description' => 'An Instagram post shared as part of the community experience library. Open the original source to see the complete post and context.',
            ],
        ];

        foreach ($sources as $source) {
            CommunityExperience::firstOrCreate(
                ['source_url' => $source['url']],
                [
                'content_type' => 'video',
                'title' => $source['title'],
                'description' => $source['description'],
                'category' => 'other',
                'status' => 'published',
                'verification_level' => 'source_linked',
                'moderation_note' => 'Source link supplied by the platform owner.',
                'published_at' => now(),
                ],
            );
        }

        CommunityExperience::query()
            ->where('source_url', 'like', '%DaKTeeDsVjY%')
            ->delete();
    }
}
