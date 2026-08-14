<?php

namespace Database\Seeders;

use App\Services\PowerbiWorkbookService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class PowerbiDataSeeder extends Seeder
{
    public function run(): void
    {
        $path = dirname(base_path()).'/AT_GRAVES_3_ANIOS.xlsx';

        if (! File::exists($path)) {
            return;
        }

        app(PowerbiWorkbookService::class)->importFile($path, basename($path));
    }
}
