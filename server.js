const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const fs = require("fs");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static("public"));

const channels = [1, 2, 3, 4];
let ffmpegProcesses = {};

// Função para apagar arquivos antigos antes de iniciar um novo stream
function limparArquivosAntigos() {
    console.log("Limpando arquivos antigos...");
    try {
        fs.readdirSync("public").forEach(file => {
            if (file.startsWith("stream") || file.endsWith(".ts")) {
                fs.unlinkSync(`public/${file}`);
            }
        });
        console.log("Arquivos antigos removidos.");
    } catch (err) {
        console.error("Erro ao limpar arquivos antigos:", err);
    }
}

app.get("/stream", (req, res) => {
    limparArquivosAntigos();

    channels.forEach(channel => {
        const rtspUrl = `rtsp://admin@192.168.1.10:554/user=admin&password=&channel=${channel}&stream=1.sdp?real_stream--rtp-caching=100`;

        // Se já houver um processo rodando para este canal, não reinicia
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
            "-hls_time", "4",
            "-hls_list_size", "6",
            "-hls_flags", "delete_segments",
            "-hls_allow_cache", "1",
            `public/stream${channel}.m3u8`
        ]);

        ffmpegProcesses[channel].stderr.on("data", data => {
            console.log(`FFmpeg (Canal ${channel}): ${data}`);
        });

        ffmpegProcesses[channel].on("close", code => {
            console.log(`FFmpeg para o canal ${channel} fechado com código ${code}`);
            delete ffmpegProcesses[channel];
        });
    });

    res.send("Streams iniciados!");
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
