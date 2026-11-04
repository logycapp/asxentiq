<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Validación de certificado</title>
    <style>
        body {
            margin: 0;
            font-family: Arial, Helvetica, sans-serif;
            background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%);
            color: #0f172a;
        }

        .wrap {
            max-width: 920px;
            margin: 0 auto;
            padding: 40px 18px 60px;
        }

        .card {
            border-radius: 28px;
            background: #ffffff;
            border: 1px solid rgba(148, 163, 184, 0.2);
            box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
            overflow: hidden;
        }

        .hero {
            padding: 28px 30px;
            color: #ffffff;
            background: linear-gradient(135deg, #1d4ed8 0%, #0f766e 100%);
        }

        .hero-top {
            display: table;
            width: 100%;
        }

        .hero-brand,
        .hero-status {
            display: table-cell;
            vertical-align: middle;
        }

        .hero-brand {
            width: 70%;
        }

        .brand-pill {
            display: inline-block;
            padding: 7px 12px;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.16);
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.2em;
            text-transform: uppercase;
        }

        .hero h1 {
            margin: 16px 0 8px;
            font-size: 32px;
            line-height: 1.05;
            letter-spacing: -0.03em;
        }

        .hero p {
            margin: 0;
            opacity: 0.92;
            line-height: 1.6;
        }

        .hero-status {
            width: 30%;
            text-align: right;
        }

        .status-badge {
            display: inline-block;
            padding: 12px 18px;
            border-radius: 999px;
            font-size: 16px;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            background: {{ $valid ? 'rgba(34, 197, 94, 0.2)' : 'rgba(248, 113, 113, 0.22)' }};
            border: 1px solid {{ $valid ? 'rgba(34, 197, 94, 0.35)' : 'rgba(248, 113, 113, 0.35)' }};
            color: #ffffff;
        }

        .body {
            padding: 30px;
        }

        .grid {
            display: table;
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
        }

        .panel {
            display: table-cell;
            vertical-align: top;
            width: 50%;
        }

        .panel + .panel {
            padding-left: 24px;
        }

        .info-card {
            border: 1px solid rgba(148, 163, 184, 0.18);
            border-radius: 22px;
            padding: 20px;
            background: #f8fafc;
            margin-bottom: 18px;
        }

        .info-label {
            font-size: 11px;
            letter-spacing: 0.22em;
            text-transform: uppercase;
            color: #64748b;
            font-weight: 700;
            margin-bottom: 8px;
        }

        .info-value {
            font-size: 18px;
            font-weight: 700;
            color: #0f172a;
            line-height: 1.4;
        }

        .company-row {
            display: table;
            width: 100%;
            margin-top: 10px;
        }

        .company-logo,
        .company-copy {
            display: table-cell;
            vertical-align: middle;
        }

        .company-logo {
            width: 76px;
        }

        .company-logo-box {
            width: 60px;
            height: 60px;
            border-radius: 16px;
            overflow: hidden;
            border: 1px solid rgba(148, 163, 184, 0.2);
            background: #ffffff;
        }

        .company-logo-box img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }

        .qr-card {
            text-align: center;
            border: 1px solid rgba(148, 163, 184, 0.18);
            border-radius: 22px;
            padding: 20px;
            background: #ffffff;
        }

        .qr-box {
            display: inline-block;
            width: 210px;
            height: 210px;
            padding: 10px;
            border-radius: 22px;
            border: 1px solid rgba(59, 130, 246, 0.18);
            background: #ffffff;
            box-sizing: border-box;
            margin: 8px 0 10px;
        }

        .qr-box img {
            width: 100%;
            height: 100%;
            display: block;
        }

        .meta-list {
            margin: 0;
            padding: 0;
            list-style: none;
        }

        .meta-list li {
            padding: 10px 0;
            border-bottom: 1px solid rgba(148, 163, 184, 0.14);
        }

        .meta-list li:last-child {
            border-bottom: 0;
        }

        .meta-key {
            display: block;
            font-size: 11px;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: #64748b;
            font-weight: 700;
            margin-bottom: 4px;
        }

        .meta-value {
            font-size: 15px;
            font-weight: 700;
            color: #0f172a;
        }

        .footer {
            margin-top: 24px;
            padding: 18px 30px 28px;
            color: #64748b;
            font-size: 12px;
            line-height: 1.7;
            text-align: center;
        }

        .footer .line {
            width: 180px;
            border-top: 1px solid rgba(148, 163, 184, 0.35);
            margin: 0 auto 14px;
        }

        .note {
            margin-top: 16px;
            padding: 14px 16px;
            border-radius: 18px;
            background: {{ $valid ? 'rgba(34, 197, 94, 0.08)' : 'rgba(248, 113, 113, 0.08)' }};
            border: 1px solid {{ $valid ? 'rgba(34, 197, 94, 0.18)' : 'rgba(248, 113, 113, 0.18)' }};
            color: #334155;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <div class="wrap">
        <div class="card">
            <div class="hero">
                <div class="hero-top">
                    <div class="hero-brand">
                        <span class="brand-pill">Validación pública</span>
                        <h1>Certificado de capacitación</h1>
                        <p>Esta pantalla permite validar que el documento fue emitido desde Asxentiq y pertenece a una capacitación registrada en el sistema.</p>
                    </div>
                    <div class="hero-status">
                        <div class="status-badge">{{ $valid ? 'Válido' : 'No válido' }}</div>
                    </div>
                </div>
            </div>

            <div class="body">
                <div class="grid">
                    <div class="panel">
                        <div class="info-card">
                            <div class="info-label">Participante</div>
                            <div class="info-value">{{ $participant->full_name }}</div>

                            <div class="company-row">
                                <div class="company-logo">
                                    <div class="company-logo-box">
                                        @if(!empty($company_logo_data_url))
                                            <img src="{{ $company_logo_data_url }}" alt="Logo de la empresa">
                                        @else
                                            <div style="width:100%;height:100%;display:table;text-align:center;background:linear-gradient(180deg,#eff6ff 0%,#ffffff 100%);">
                                                <div style="display:table-cell;vertical-align:middle;font-size:12px;font-weight:800;color:#2563eb;letter-spacing:0.08em;">{{ strtoupper(mb_substr($company_name ?? 'AS', 0, 2)) }}</div>
                                            </div>
                                        @endif
                                    </div>
                                </div>
                                <div class="company-copy">
                                    <div class="meta-key">Empresa</div>
                                    <div class="meta-value">{{ $company_name ?? 'Sin empresa registrada' }}</div>
                                </div>
                            </div>
                        </div>

                        <div class="info-card">
                            <div class="meta-key">Capacitación</div>
                            <div class="info-value">{{ $training->title }}</div>
                            <div style="margin-top: 10px;">
                                <span class="meta-key">Cédula</span>
                                <span class="meta-value">{{ $participant->document_number }}</span>
                            </div>
                        </div>

                        <div class="info-card">
                            <ul class="meta-list">
                                <li>
                                    <span class="meta-key">Código de validación</span>
                                    <span class="meta-value">{{ $certificate_code }}</span>
                                </li>
                                <li>
                                    <span class="meta-key">Verificado en</span>
                                    <span class="meta-value">{{ $verified_at->format('d/m/Y H:i') }}</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div class="panel">
                        <div class="qr-card">
                            <div class="info-label">QR de verificación</div>
                            <div class="qr-box">
                                @if(!empty($qr_image_data_url))
                                    <img src="{{ $qr_image_data_url }}" alt="QR de validación">
                                @endif
                            </div>
                            <div class="note">
                                Si el código QR abre esta pantalla con el estado <strong>Válido</strong>, el certificado fue emitido correctamente por el sistema.
                            </div>
                        </div>

                        <div class="info-card" style="margin-top: 18px;">
                            <ul class="meta-list">
                                <li>
                                    <span class="meta-key">Firma técnica</span>
                                    <span class="meta-value">Asxentiq Certificate Authority</span>
                                </li>
                                <li>
                                    <span class="meta-key">Firma de verificación</span>
                                    <span class="meta-value">{{ $signature_valid ? 'Correcta' : 'Inválida' }}</span>
                                </li>
                                <li>
                                    <span class="meta-key">Pertenece a la capacitación</span>
                                    <span class="meta-value">{{ $belongs_to_training ? 'Sí' : 'No' }}</span>
                                </li>
                                <li>
                                    <span class="meta-key">Estado académico</span>
                                    <span class="meta-value">{{ $is_completed ? 'Completada' : 'Pendiente' }}</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <div class="footer">
                <div class="line"></div>
                <div>Asxentiq SAS · Validación pública de certificados</div>
                <div>Este documento se genera y verifica electrónicamente desde el sistema.</div>
            </div>
        </div>
    </div>
</body>
</html>
