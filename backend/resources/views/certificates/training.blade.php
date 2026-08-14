<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Certificado de Capacitacion</title>

    <style>
        @page {
            size: A4 landscape;
            margin: 0;
        }

        html,
        body {
            margin: 0;
            padding: 0;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            padding: 0;
            font-family: DejaVu Sans, Helvetica, Arial, sans-serif;
            background: #ffffff;
            color: #0f172a;
            overflow: hidden;
        }

        /*
         * IMPORTANTE:
         * A4 horizontal = 297mm x 210mm.
         *
         * Se usa 209mm de alto para evitar que Dompdf
         * genere una segunda página por redondeo.
         */
        .sheet {
            position: relative;
            width: 297mm;
            height: 209mm;
            margin: 0;
            padding: 0;
            overflow: hidden;

            page-break-before: avoid;
            page-break-after: avoid;
            page-break-inside: avoid;
        }

        .certificate-background {
            position: absolute;
            top: 0;
            left: 0;
            width: 297mm;
            height: 209mm;
            object-fit: cover;
            z-index: 0;
            margin: 0;
            padding: 0;
        }

        .certificate-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 1;
            padding: 3mm;
            overflow: hidden;
        }

        .certificate-card {
            position: relative;
            width: 100%;
            height: 100%;
            padding: 4mm 5mm;
            overflow: hidden;
        }

        .header {
            display: table;
            width: 100%;
            table-layout: fixed;
        }

        .header-left,
        .header-right {
            display: table-cell;
            vertical-align: top;
        }

        .header-left {
            width: 34%;
        }

        .brand {
            width: 48mm;
        }

        .brand-logo {
            width: 32mm;
            max-width: 32mm;
            height: auto;
            display: block;
        }

        .hero {
            width: 100%;
            text-align: center;
            margin-top: 7mm;
        }

        .hero-title {
            margin: 0;
            font-size: 20.5pt;
            line-height: 1;
            color: #0f5ac3;
            font-weight: 900;
            letter-spacing: -0.04em;
            padding-top:50px;
        }

        .recipient {
            margin-top: 6mm;
            text-align: center;
        }

        .recipient-name {
            display: inline-block;
            min-width: 118mm;
            padding-bottom: 1.5mm;
            font-size: 16pt;
            line-height: 1.1;
            font-weight: 900;
            color: #12b5a8;
            border-bottom: 1.25pt solid #15a0d8;
            letter-spacing: -0.02em;
        }

        .recipient-document {
            margin-top: 1.8mm;
            font-size: 9pt;
            line-height: 1.1;
            color: #475569;
            font-weight: 700;
            letter-spacing: 0.02em;
        }

        .body-copy {
            margin-top: 6mm;
            text-align: center;
            font-size: 11pt;
            line-height: 1.55;
            color: #475569;
        }

        .body-copy .accent {
            color: #0f5ac3;
            font-weight: 800;
        }

        .training-pill {
            width: 146mm;
            max-width: 100%;
            margin: 4mm auto 0;
            padding: 3.5mm 7mm 3.5mm 6mm;
            border-left: 2.8mm solid #18c7c0;
            border-radius: 3mm;
            background: rgba(233, 245, 255, 0.88);
            text-align: center;
        }

        .training-pill-title {
            margin: 0;
            font-size: 15.5pt;
            line-height: 1.15;
            font-weight: 900;
            color: #1d4ed8;
            letter-spacing: -0.03em;
        }

        .details {
            margin-top: 5mm;
            text-align: center;
            font-size: 10.6pt;
            line-height: 1.45;
            color: #475569;
        }

        .details .accent {
            color: #18b5ab;
            font-weight: 800;
        }

        .bottom-line {
            position: absolute;
            left: 50%;
            bottom: 30mm;
            width: 54mm;
            transform: translateX(-50%);
            border-top: 1.2pt solid #1d4ed8;
        }

        .signature {
            position: absolute;
            left: 50%;
            bottom: 15mm;
            width: 64mm;
            transform: translateX(-50%);
            text-align: center;
        }

        .signature .role {
            font-size: 8.8pt;
            line-height: 1.1;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: 0.02em;
        }

        .signature .subrole {
            margin-top: 1mm;
            font-size: 6.8pt;
            line-height: 1.1;
            color: #64748b;
        }

        .slogan {
            position: absolute;
            left: 50%;
            bottom: 1mm;
            width: 100%;
            transform: translateX(-50%);
            text-align: center;
            font-size: 10.5pt;
            line-height: 1;
            font-style: italic;
            font-weight: 900;
            color: #14b8a6;
            letter-spacing: -0.02em;
        }

        .qr-box {
            position: absolute;
            right: 20mm;
            bottom: 15mm;
            width: 28mm;
            height: 35mm;
            padding: 2.5mm 2.5mm 2.2mm;
            border-radius: 2.5mm;
            border: 0.7pt solid rgba(226, 232, 240, 0.9);
            background: rgba(255, 255, 255, 0.72);
            text-align: center;
            overflow: hidden;
        }

        .qr-box .title {
            margin: 0 0 2.5mm;
            font-size: 7pt;
            line-height: 1;
            font-weight: 800;
            color: #cbd5e1;
            letter-spacing: 0.14em;
            text-transform: uppercase;
        }

        .qr-box img {
            width: 100%;
            height: 25mm;
            object-fit: contain;
            display: block;
            margin: 0;
            padding: 0;
        }

        .qr-fallback {
            width: 100%;
            height: 25mm;
            padding: 1.5mm;
            border: 1px dashed #93c5fd;
            border-radius: 2mm;
            color: #2563eb;
            font-size: 7pt;
            line-height: 1.3;
            text-align: center;
        }
    </style>
</head>

<body>

    @php
        $issuedDate = \Carbon\Carbon::parse($completed_at)->format('d/m/Y');

        $durationLabel = $duration_hours !== null
            ? $duration_hours . ' horas'
            : 'N/D';
    @endphp

    <div class="sheet">

        {{-- Fondo del certificado --}}
        @if(!empty($background_image_data_url))
            <img
                class="certificate-background"
                src="{{ $background_image_data_url }}"
                alt=""
            >
        @endif

        <div class="certificate-overlay">

            <div class="certificate-card">

                {{-- Encabezado / Logo --}}
                <div class="header">

                    <div class="header-left">

                        <div class="brand">

                            @if(!empty($company_logo_data_url))

                                <img
                                    class="brand-logo"
                                    src="{{ $company_logo_data_url }}"
                                    alt="{{ $company_name ?? 'Asxentiq' }}"
                                >

                            @else

                                <svg
                                    class="brand-logo"
                                    viewBox="0 0 240 100"
                                    aria-hidden="true"
                                >

                                    <defs>
                                        <linearGradient
                                            id="brandGradient"
                                            x1="0%"
                                            y1="0%"
                                            x2="100%"
                                            y2="100%"
                                        >
                                            <stop
                                                offset="0%"
                                                stop-color="#0f5ac3"
                                            />

                                            <stop
                                                offset="100%"
                                                stop-color="#18c7c0"
                                            />
                                        </linearGradient>
                                    </defs>

                                    <rect
                                        x="2"
                                        y="2"
                                        width="236"
                                        height="96"
                                        rx="18"
                                        fill="#ffffff"
                                        opacity="0"
                                    />

                                    <circle
                                        cx="54"
                                        cy="47"
                                        r="26"
                                        fill="url(#brandGradient)"
                                    />

                                    <text
                                        x="54"
                                        y="55"
                                        text-anchor="middle"
                                        font-family="DejaVu Sans, Arial, sans-serif"
                                        font-size="24"
                                        font-weight="800"
                                        fill="#ffffff"
                                    >
                                        A
                                    </text>

                                    <text
                                        x="90"
                                        y="54"
                                        font-family="DejaVu Sans, Arial, sans-serif"
                                        font-size="20"
                                        font-weight="800"
                                        fill="#0f5ac3"
                                    >
                                        ASXENTIQ S.A.S.
                                    </text>

                                </svg>

                            @endif

                        </div>

                    </div>

                    <div class="header-right"></div>

                </div>

                {{-- Título --}}
                <div class="hero">
                    <h1 class="hero-title">
                        CERTIFICA QUE:
                    </h1>
                </div>

                {{-- Persona --}}
                <div class="recipient">

                    <div class="recipient-name">
                        {{ $user_name }}
                    </div>

                    <div class="recipient-document">
                        C.C. {{ $document_number }}
                    </div>

                </div>

                {{-- Texto --}}
                <div class="body-copy">

                    <span class="accent">
                        Participó satisfactoriamente
                    </span>

                    en la formación virtual de:

                </div>

                {{-- Curso --}}
                <div class="training-pill">

                    <p class="training-pill-title">
                        {{ $training_title }}
                    </p>

                </div>

                {{-- Duración y fecha --}}
                <div class="details">

                    Con una intensidad de:

                    <span class="accent">
                        {{ $durationLabel }}
                    </span>

                    el día

                    <span class="accent">
                        {{ $issuedDate }}
                    </span>

                </div>

                {{-- Firma --}}
                <div class="bottom-line"></div>

                <div class="signature">

                    <div class="role">
                        DIRECCIÓN ACADÉMICA
                    </div>

                    <div class="subrole">
                        Asxentiq Formación Virtual
                    </div>

                </div>

                {{-- Slogan --}}
                <div class="slogan">
                    ¡Formando equipos para los desafíos del mañana!
                </div>

                {{-- QR --}}
                <div class="qr-box">

                    <div class="title">
                        CÓDIGO QR
                    </div>

                    @if(!empty($qr_image_data_url))

                        <img
                            src="{{ $qr_image_data_url }}"
                            alt="QR de validación"
                        >

                    @else

                        <div class="qr-fallback">

                            Verificación electrónica

                            <br>

                            {{ $certificate_code }}

                        </div>

                    @endif

                </div>

            </div>

        </div>

    </div>

</body>
</html>