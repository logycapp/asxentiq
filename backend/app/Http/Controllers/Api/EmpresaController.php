<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class EmpresaController extends Controller
{
    public function index(): JsonResponse
    {
        $empresas = Empresa::query()
            ->orderBy('name')
            ->get();

        return response()->json($empresas);
    }

    public function show(Empresa $empresa): JsonResponse
    {
        return response()->json($empresa);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatePayload($request);

        $empresa = Empresa::query()->create([
            'name' => $data['name'],
            'tax_id' => $data['tax_id'] ?? null,
            'address' => $data['address'] ?? null,
            'phone' => $data['phone'] ?? null,
            'email' => $data['email'] ?? null,
            'active' => $data['active'] ?? true,
            'logo_path' => $this->storeLogo($request),
        ]);

        return response()->json([
            'message' => 'Empresa creada correctamente.',
            'empresa' => $empresa,
        ], 201);
    }

    public function update(Request $request, Empresa $empresa): JsonResponse
    {
        $data = $this->validatePayload($request, $empresa);

        $logoPath = $empresa->logo_path;

        if ($request->hasFile('logo')) {
            if ($logoPath) {
                Storage::disk('public')->delete($logoPath);
            }

            $logoPath = $this->storeLogo($request);
        }

        $empresa->update([
            'name' => $data['name'],
            'tax_id' => $data['tax_id'] ?? null,
            'address' => $data['address'] ?? null,
            'phone' => $data['phone'] ?? null,
            'email' => $data['email'] ?? null,
            'active' => $data['active'] ?? $empresa->active,
            'logo_path' => $logoPath,
        ]);

        return response()->json([
            'message' => 'Empresa actualizada correctamente.',
            'empresa' => $empresa->fresh(),
        ]);
    }

    public function destroy(Empresa $empresa): JsonResponse
    {
        if ($empresa->logo_path) {
            Storage::disk('public')->delete($empresa->logo_path);
        }

        $empresa->delete();

        return response()->json([
            'message' => 'Empresa eliminada correctamente.',
        ]);
    }

    public function activate(Empresa $empresa): JsonResponse
    {
        $empresa->update([
            'active' => true,
        ]);

        return response()->json([
            'message' => 'Empresa activada correctamente.',
            'empresa' => $empresa->fresh(),
        ]);
    }

    public function deactivate(Empresa $empresa): JsonResponse
    {
        $empresa->update([
            'active' => false,
        ]);

        return response()->json([
            'message' => 'Empresa desactivada correctamente.',
            'empresa' => $empresa->fresh(),
        ]);
    }

    private function validatePayload(Request $request, ?Empresa $empresa = null): array
    {
        return $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('empresas', 'name')->ignore($empresa?->id),
            ],
            'tax_id' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('empresas', 'tax_id')->ignore($empresa?->id),
            ],
            'address' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255', Rule::unique('empresas', 'email')->ignore($empresa?->id)],
            'active' => ['sometimes', 'boolean'],
            'logo' => ['nullable', 'file', 'image', 'mimes:png', 'max:10240'],
        ]);
    }

    private function storeLogo(Request $request): ?string
    {
        if (! $request->hasFile('logo')) {
            return null;
        }

        return $request->file('logo')->store('empresa-logos', 'public');
    }
}
