const express = require("express");
const cors = require("cors");
const fs = require("fs");

const { spawn } = require("child_process");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static("public"));

const channels = [1, 2, 3, 4];
let ffmpegProcesses = {};

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

const rtspIp = '192.168.1.10';
const rstpPort = '554';
const rtspUser = 'admin';
const rtspPassword = '';

app.get("/stream", (req, res) => {
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
            "-hls_time", "4",
            "-hls_list_size", "10",
            "-hls_delete_threshold", "2",
            "-hls_flags", "split_by_time+program_date_time",
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

app.get("/comments/:videoId", (req, res) => {
    const { videoId } = req.params;
    const filePath = `public/${videoId}.txt`;

    if (fs.existsSync(filePath)) {
        res.sendFile(filePath, { root: "." });
    } else {
        res.send("Aguardando análise...");
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
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
