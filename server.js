const express = require("express");
const cors = require("cors");
const fs = require("fs");
const WebSocket = require("ws");

const { spawn } = require("child_process");

const app = express();
const server = require("http").createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = 3000;
const rtspIp = '192.168.1.10';
const rstpPort = '554';
const rtspUser = 'admin';
const rtspPassword = '';

app.use(cors());
app.use(express.static("public"));

const channels = [1, 2, 3, 4];
const ffmpegProcesses = {};
const streams = {};

channels.forEach(channel => {
    streams[`video${channel}`] = `rtsp://${rtspUser}@${rtspIp}:${rstpPort}/user=${rtspUser}&password=${rtspPassword}&channel=${channel}&stream=1.sdp?real_stream--rtp-caching=100`;
});

function limparArquivosAntigos() {
    console.log("Limpando arquivos antigos...");
    try {
        fs.readdirSync("public").forEach(file => {
            if (file.startsWith("stream") || file.endsWith(".ts") || file.startsWith("video")) {
                fs.unlinkSync(`public/${file}`);
            }
        });
        console.log("Arquivos antigos removidos.");
    } catch (err) {
        console.error("Erro ao limpar arquivos antigos:", err);
    }
}

function startStream(channel, url) {
    console.log(`Iniciando stream WS para o canal ${channel}`);

    const ffmpeg = spawn("ffmpeg", [
        "-rtsp_transport", "tcp",
        "-i", url,
        "-f", "mjpeg",
        "-q:v", "10",
        "pipe:1"
    ]);

    ffmpeg.stdout.on("data", (data) => {
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ channel, frame: data.toString("base64") }));
            }
        });
    });

    ffmpeg.stderr.on("data", (data) => {
        // console.error(`FFmpeg (Canal ${channel}): ${data}`);
    });

    ffmpeg.on("close", () => {
        console.log(`Stream ${channel} finalizado.`);
    });
}

function streamToM3U8() {
    limparArquivosAntigos();

    channels.forEach(channel => {
        const rtspUrl = `rtsp://${rtspUser}@${rtspIp}:${rstpPort}/user=${rtspUser}&password=${rtspPassword}&channel=${channel}&stream=1.sdp?real_stream--rtp-caching=100`;

        if (ffmpegProcesses[channel]) {
            return;
        }

        console.log(`Iniciando stream RTSP → HLS para o canal ${channel}`);

        ffmpegProcesses[channel] = spawn("ffmpeg", [
            "-rtsp_transport", "tcp",
            "-i", rtspUrl,
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "128k",
            "-strict", "experimental",
            "-f", "hls",
            "-hls_time", "3",
            "-hls_list_size", "20",
            "-hls_delete_threshold", "10",
            "-hls_flags", "delete_segments+program_date_time",
            "-hls_allow_cache", "1",
            "-hls_playlist_type", "event",
            "-hls_segment_filename", `public/stream${channel}_%03d.ts`,
            `public/stream${channel}.m3u8`
        ]);

        ffmpegProcesses[channel].stderr.on("data", data => {
            // console.log(`FFmpeg (Canal ${channel}): ${data}`);
        });

        ffmpegProcesses[channel].on("close", code => {
            console.log(`FFmpeg para o canal ${channel} fechado com código ${code}`);
            delete ffmpegProcesses[channel];
        });
    });
};

app.get("/comments/:videoId", (req, res) => {
    const { videoId } = req.params;
    const filePath = `public/${videoId}.txt`;

    if (fs.existsSync(filePath)) {
        res.sendFile(filePath, { root: "." });
    } else {
        res.send("Aguardando análise...");
    }
});

server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    Object.entries(streams).forEach(([channel, url]) => startStream(channel, url));
    streamToM3U8();
});

wss.on("connection", (ws) => {
    console.log("Novo cliente conectado ao WebSocket");
    ws.on("close", () => console.log("Cliente WebSocket desconectado"));
});

process.on("SIGINT", () => {
    console.log("\nServidor encerrando... Limpando arquivos antigos.");
    limparArquivosAntigos();
    process.exit(0);
});

process.on("SIGTERM", () => {
    console.log("\nRecebido SIGTERM, limpando arquivos...");
    limparArquivosAntigos();
    process.exit(0);
});
