<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('powerbi_datas', function (Blueprint $table): void {
            $table->id();
            $table->string('source_file')->nullable();
            $table->string('sheet_name');
            $table->unsignedInteger('source_row_number');
            $table->string('numero_siniestro')->nullable();
            $table->string('no_identificacion')->nullable();
            $table->string('nit')->nullable();
            $table->dateTime('fecha_siniestro')->nullable();
            $table->string('causal_evento_grave')->nullable();
            $table->string('municipio_ocurrencia_siniestro')->nullable();
            $table->string('departamento_ocurrencia_siniestro')->nullable();
            $table->string('cie_10_dx_1')->nullable();
            $table->string('nombre_dx_1')->nullable();
            $table->longText('detalle')->nullable();
            $table->string('mecanismo')->nullable();
            $table->json('raw_data')->nullable();
            $table->timestamps();

            $table->index(['sheet_name', 'source_row_number']);
            $table->index('numero_siniestro');
            $table->index('fecha_siniestro');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('powerbi_datas');
    }
};
