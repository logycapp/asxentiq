<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Certificado de Capacitacion</title>
    <style>
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            margin: 0;
            padding: 0;
            background: #fff;
        }
        .certificate {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            padding: 60px 40px;
            border: 5px solid #1a73e8;
            text-align: center;
        }
        .header {
            margin-bottom: 30px;
        }
        .header h1 {
            font-size: 36px;
            color: #1a73e8;
            margin: 0 0 5px;
        }
        .header h2 {
            font-size: 18px;
            color: #666;
            font-weight: normal;
            margin: 0;
        }
        .content {
            margin: 40px 0;
        }
        .content h3 {
            font-size: 14px;
            color: #888;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 10px;
        }
        .content .user-name {
            font-size: 32px;
            font-weight: bold;
            color: #333;
            margin: 10px 0;
        }
        .content .document {
            font-size: 16px;
            color: #666;
            margin: 5px 0 20px;
        }
        .content .training-title {
            font-size: 22px;
            font-weight: bold;
            color: #1a73e8;
            margin: 15px 0;
        }
        .result-box {
            margin: 30px auto;
            padding: 20px;
            border: 2px solid {{ $passed ? '#28a745' : '#dc3545' }};
            border-radius: 10px;
            display: inline-block;
        }
        .result-box .score {
            font-size: 48px;
            font-weight: bold;
            color: {{ $passed ? '#28a745' : '#dc3545' }};
        }
        .result-box .label {
            font-size: 14px;
            color: #666;
            text-transform: uppercase;
        }
        .result-box .status {
            font-size: 20px;
            font-weight: bold;
            color: {{ $passed ? '#28a745' : '#dc3545' }};
            margin-top: 10px;
        }
        .footer {
            margin-top: 50px;
            font-size: 12px;
            color: #999;
        }
        .footer p {
            margin: 5px 0;
        }
        .line {
            width: 200px;
            border-top: 1px solid #ccc;
            margin: 30px auto 10px;
        }
    </style>
</head>
<body>
    <div class="certificate">
        <div class="header">
            <h1>ASXENTIQ</h1>
            <h2>Certificado de Capacitacion</h2>
        </div>

        <div class="content">
            <h3>Otorgado a:</h3>
            <div class="user-name">{{ $user_name }}</div>
            <div class="document">Cedula: {{ $document_number }}</div>

            <h3>Por completar:</h3>
            <div class="training-title">{{ $training_title }}</div>

            <div class="result-box">
                <div class="label">Puntaje</div>
                <div class="score">{{ $score ?? 'N/A' }}%</div>
                <div class="status">
                    {{ $passed ? 'APROBADO' : 'NO APROBADO' }}
                </div>
            </div>

            <p style="margin-top: 20px; color: #666;">
                Fecha de finalizacion: {{ \Carbon\Carbon::parse($completed_at)->format('d/m/Y') }}
                <br>
                Puntaje minimo requerido: {{ $passing_score }}%
            </p>
        </div>

        <div class="footer">
            <div class="line"></div>
            <p>Asxentiq - Sistema de Gestion de Capacitaciones</p>
            <p>Este certificado es generado electronicamente.</p>
        </div>
    </div>
</body>
</html>