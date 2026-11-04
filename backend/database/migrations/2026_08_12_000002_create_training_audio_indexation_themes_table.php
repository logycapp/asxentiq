<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('training_audio_indexation_themes')) {
            return;
        }

        Schema::create('training_audio_indexation_themes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('training_audio_indexation_id');
            $table->foreign('training_audio_indexation_id', 'tait_indexation_fk')
                ->references('id')
                ->on('training_audio_indexations')
                ->cascadeOnDelete();
            $table->unsignedInteger('theme_order');
            $table->text('theme_text');
            $table->unsignedInteger('start_seconds');
            $table->unsignedInteger('end_seconds');
            $table->timestamps();

            $table->unique(['training_audio_indexation_id', 'theme_order'], 'tai_theme_order_unique');
            $table->index(['training_audio_indexation_id', 'start_seconds'], 'tai_theme_start_index');
        });

        if (! Schema::hasTable('training_audio_indexations')) {
            return;
        }

        $indexations = DB::table('training_audio_indexations')->select(['id', 'result_data'])->get();

        foreach ($indexations as $indexation) {
            $resultData = is_string($indexation->result_data)
                ? json_decode($indexation->result_data, true)
                : $indexation->result_data;

            if (! is_array($resultData)) {
                continue;
            }

            $themes = $this->normalizeThemes($resultData['temas_detectados'] ?? []);
            if ($themes === []) {
                continue;
            }

            foreach ($themes as $theme) {
                DB::table('training_audio_indexation_themes')->insert([
                    'training_audio_indexation_id' => $indexation->id,
                    'theme_order' => $theme['theme_order'],
                    'theme_text' => $theme['theme_text'],
                    'start_seconds' => $theme['start_seconds'],
                    'end_seconds' => $theme['end_seconds'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('training_audio_indexation_themes');
    }

    /**
     * @param  mixed  $items
     * @return array<int, array{theme_order:int, theme_text:string, start_seconds:int, end_seconds:int}>
     */
    private function normalizeThemes(mixed $items): array
    {
        if (! is_array($items) || $items === []) {
            return [];
        }

        $normalized = [];

        foreach ($items as $index => $item) {
            if (! is_array($item)) {
                continue;
            }

            $themeOrder = (int) ($item['orden'] ?? $index + 1);
            $themeText = trim((string) ($item['tema'] ?? ''));
            $startSeconds = (int) round((float) ($item['inicio'] ?? 0));
            $endSeconds = (int) round((float) ($item['fin'] ?? 0));

            if ($themeOrder <= 0 || $themeText === '' || $startSeconds < 0 || $endSeconds < $startSeconds) {
                continue;
            }

            $normalized[] = [
                'theme_order' => $themeOrder,
                'theme_text' => $themeText,
                'start_seconds' => $startSeconds,
                'end_seconds' => $endSeconds,
            ];
        }

        return $normalized;
    }
};
