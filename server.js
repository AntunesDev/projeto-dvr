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
const streams = {};

channels.forEach(channel => {
    streams[`video${channel}`] = `rtsp://${rtspUser}@${rtspIp}:${rstpPort}/user=${rtspUser}&password=${rtspPassword}&channel=${channel}&stream=1.sdp?real_stream--rtp-caching=100`;
});

function startStream(channel, url) {
    console.log(`Iniciando stream WS para o canal ${channel}`);

    const ffmpeg = spawn("ffmpeg", [
        "-rtsp_transport", "tcp",
        "-i", url,
        "-f", "mjpeg",
        "-q:v", "1",
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
});

wss.on("connection", (ws) => {
    console.log("Novo cliente conectado ao WebSocket");
    ws.on("close", () => console.log("Cliente WebSocket desconectado"));
});

process.on("SIGINT", () => {
    console.log("\nServidor encerrando... Limpando arquivos antigos.");
    process.exit(0);
});

process.on("SIGTERM", () => {
    console.log("\nRecebido SIGTERM, limpando arquivos...");
    process.exit(0);
});
