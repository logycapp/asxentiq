<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Certificado de Capacitacion</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 5mm;
        }

        html, body {
            margin: 0;
            padding: 0;
        }

        * {
            box-sizing: border-box;
        }

        body {
            font-family: DejaVu Sans, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
        }

        .sheet {
            position: relative;
            width: 100%;
            min-height: 100vh;
        }

        .frame {
            position: relative;
            width: 66%;
            max-width: 176mm;
            margin: 50px auto 0;
            min-height: 260mm;
            border: 1.5px solid #3b82f6;
            padding: 5mm 7mm 6mm;
            display: flex;
            flex-direction: column;
        }

        .topbar {
            display: table;
            width: 100%;
            margin-bottom: 4px;
            table-layout: fixed;
        }

        .brand-block,
        .qr-block {
            display: table-cell;
            vertical-align: top;
        }

        .brand-block {
            width: 70%;
        }

        .qr-block {
            width: 30%;
            text-align: right;
        }

        .brand-row {
            display: table;
            width: 100%;
        }

        .brand-logo,
        .brand-copy {
            display: table-cell;
            vertical-align: middle;
        }

        .brand-logo {
            width: auto;
            padding-right: 8px;
        }

        .brand-logo-box {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            background: transparent;
            border: 0;
        }

        .brand-logo-box img {
            display: block;
            width: 118px;
            max-width: 118px;
            height: auto;
        }

        .brand-kicker {
            font-size: 8px;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            color: #64748b;
            margin-bottom: 1px;
            font-weight: 700;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .brand-name {
            font-size: 20px;
            line-height: 1;
            margin: 0;
            color: #2563eb;
            font-weight: 800;
            letter-spacing: 0.04em;
        }

        .brand-subtitle {
            font-size: 8px;
            margin: 2px 0 0;
            color: #475569;
        }

        .qr-title {
            font-size: 7px;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            color: #64748b;
            margin-bottom: 4px;
            font-weight: 700;
        }

        .qr-box {
            display: inline-block;
            width: 80px;
            height: 80px;
            padding: 3px;
            border-radius: 14px;
            border: 1px solid rgba(59, 130, 246, 0.2);
            background: #ffffff;
            box-sizing: border-box;
        }

        .qr-box img {
            width: 100%;
            height: 100%;
            display: block;
            margin: 0;
        }

        .qr-fallback {
            display: table;
            width: 100%;
            height: 100%;
            border: 2px dashed #93c5fd;
            border-radius: 10px;
            color: #2563eb;
            font-size: 8px;
            line-height: 1.3;
            text-align: center;
        }

        .qr-fallback span {
            display: table-cell;
            vertical-align: middle;
            padding: 6px;
        }

        .title-block {
            text-align: center;
            margin: 6px 0 8px;
        }

        .title-block .eyebrow {
            display: inline-block;
            font-size: 8px;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: #64748b;
            font-weight: 700;
            margin-bottom: 4px;
        }

        .title-block h1 {
            margin: 0;
            font-size: 26px;
            color: #1d4ed8;
            line-height: 1;
            letter-spacing: -0.03em;
        }

        .title-block p {
            margin: 4px 0 0;
            font-size: 10px;
            color: #475569;
        }

        .recipient,
        .training-section,
        .result-section {
            text-align: center;
        }

        .label {
            font-size: 8px;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            color: #94a3b8;
            font-weight: 700;
            margin-bottom: 4px;
        }

        .recipient-name {
            font-size: 22px;
            font-weight: 800;
            color: #0f172a;
            margin: 0;
            letter-spacing: -0.03em;
        }

        .recipient-document {
            font-size: 9px;
            color: #475569;
            margin: 4px 0 0;
        }

        .training-title {
            font-size: 16px;
            font-weight: 800;
            color: #2563eb;
            margin: 0;
            line-height: 1.25;
        }

        .result-box {
            display: inline-block;
            margin: 10px auto 8px;
            min-width: 200px;
            padding: 12px 18px 10px;
            border-radius: 16px;
            border: 2px solid {{ $passed ? '#22c55e' : '#ef4444' }};
            background: {{ $passed ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)' }};
        }

        .result-box .small-label {
            font-size: 8px;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #64748b;
            margin-bottom: 2px;
            font-weight: 700;
        }

        .result-box .score {
            font-size: 34px;
            line-height: 1;
            font-weight: 900;
            color: {{ $passed ? '#16a34a' : '#dc2626' }};
            margin: 0;
        }

        .result-box .status {
            margin-top: 4px;
            font-size: 13px;
            font-weight: 800;
            color: {{ $passed ? '#16a34a' : '#dc2626' }};
            letter-spacing: 0.08em;
        }

        .meta {
            margin-top: 5px;
            font-size: 9px;
            color: #475569;
            line-height: 1.35;
        }

        .footer {
            margin-top: auto;
            text-align: center;
            color: #94a3b8;
            font-size: 8px;
            padding-top: 4px;
        }

        .footer .line {
            width: 120px;
            border-top: 1px solid #cbd5e1;
            margin: 0 auto 4px;
        }

        .content {
            display: flex;
            flex-direction: column;
            min-height: 0;
            flex: 1 1 auto;
        }
    </style>
</head>
<body>
    <div class="sheet">
        <div class="frame">
            <div class="content">
                <div class="topbar">
                <div class="brand-block">
                    <div class="brand-row">
                        <div class="brand-logo">
                            <div class="brand-logo-box">
                                @if(!empty($company_logo_data_url))
                                    <img src="{{ $company_logo_data_url }}" alt="{{ $company_name ?? 'Logo' }}">
                                @else
                                    <svg width="100%" height="100%" viewBox="0 0 100 100" aria-hidden="true">
                                        <rect x="2" y="2" width="96" height="96" rx="18" fill="#ffffff" stroke="#3b82f6" stroke-width="2"/>
                                        <circle cx="50" cy="44" r="20" fill="#3b82f6"/>
                                        <text x="50" y="50" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="19" font-weight="800" fill="#ffffff">{{ strtoupper(mb_substr($company_name ?? 'AS', 0, 2)) }}</text>
                                        <text x="50" y="74" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="7" font-weight="700" fill="#334155">ASXENTIQ</text>
                                    </svg>
                                @endif
                            </div>
                        </div>
                        <div class="brand-copy">
                            <div class="brand-kicker">ASXENTIQ SAS</div>
                            <h1 class="brand-name">Certificado</h1>
                            <p class="brand-subtitle">Certificado de capacitacion emitido por el sistema</p>
                        </div>
                    </div>
                </div>

                <div class="qr-block">
                    <div class="qr-title">Validación</div>
                    <div class="qr-box">
                        @if(!empty($qr_image_data_url))
                            <img src="{{ $qr_image_data_url }}" alt="QR de validación">
                        @else
                            <div class="qr-fallback">
                                <span>Verificación electrónica<br>{{ $certificate_code }}</span>
                            </div>
                        @endif
                    </div>
                </div>
                </div>

                <div class="title-block">
                <div class="eyebrow">Certificado de capacitación</div>
                <h1>ASXENTIQ</h1>
                <p>Este documento valida que la formación fue completada y emitida desde el sistema.</p>
                </div>

                <div class="recipient">
                <div class="label">Otorgado a</div>
                <div class="recipient-name">{{ $user_name }}</div>
                <div class="recipient-document">Cédula: {{ $document_number }}</div>
                </div>

                <div class="training-section" style="margin-top: 10px;">
                <div class="label">Por completar</div>
                <div class="training-title">{{ $training_title }}</div>
                </div>

                <div class="result-section">
                <div class="result-box">
                    <div class="small-label">Puntaje final</div>
                    <div class="score">{{ number_format((float) $score, 2) }}%</div>
                    <div class="status">{{ $passed ? 'APROBADO' : 'NO APROBADO' }}</div>
                </div>
                </div>

                <div class="meta">
                Fecha de finalización: {{ \Carbon\Carbon::parse($completed_at)->format('d/m/Y H:i') }}<br>
                Puntaje mínimo requerido: {{ number_format((float) $passing_score, 2) }}%<br>
                Código de validación: <strong>{{ $certificate_code }}</strong>
                </div>
            </div>

            <div class="footer">
                <div class="line"></div>
                <div>Asxentiq - Sistema de Gestión de Capacitaciones · {{ $certificate_code }}</div>
                <div>Certificado emitido electrónicamente con validación pública</div>
            </div>
        </div>
    </div>
</body>
</html>
