# Monitoramento de DVR com IA

Este projeto implementa um **sistema de monitoramento de câmeras DVR** com **análise em tempo real utilizando IA**. Ele exibe até **4 feeds de vídeo RTSP** e descreve automaticamente o que está acontecendo em cada um, atualizando textos conforme mudanças na cena.

## **📌 Tecnologias Utilizadas**

### **Backend (Node.js)**

- Express.js (Servidor HTTP)
- FFmpeg (Conversão RTSP → HLS)
- HLS.js (Player de vídeo no frontend)

### **Análise de Vídeo (Python)**

- OpenCV (Processamento de imagens)
- YOLO (Detecção de objetos em tempo real)
- Threading (Execução paralela das análises)

---

## **🚀 Como Rodar o Projeto**

### **1️⃣ Clonar o Repositório**

```sh
git clone https://github.com/AntunesDev/projeto-dvr
cd projeto-dvr
```

### **2️⃣ Configurar o Backend (Node.js)**

1. **Instalar as dependências**

```sh
cd backend  # Caso tenha um diretório separado para backend
npm install
```

2. **Iniciar o servidor Node.js**

```sh
node server.js
```

📌 O servidor estará rodando em **`http://localhost:3000`**.

---

### **3️⃣ Configurar a IA (Python)**

1. **Criar e ativar o ambiente virtual**

```sh
python3 -m venv venv
source venv/bin/activate  # Linux/macOS
venv\Scripts\activate  # Windows
```

2. **Instalar as dependências**

```sh
pip install -r requirements.txt
```

3. **Iniciar a IA para análise de vídeos**

```sh
python video_ai.py
```

📌 A IA processará os vídeos em tempo real e atualizará os textos descritivos.

---

## **🎯 Como Acessar o Sistema**

Após iniciar o **backend** e a **IA**, abra o navegador e acesse:

```
http://localhost:3000/
```

Você verá a interface exibindo **4 vídeos RTSP** com **textos gerados automaticamente pela IA** para cada feed de câmera.

---

## **📌 Funcionalidades**

✅ **Exibe até 4 câmeras DVR em um grid 2x4 (RTSP → HLS)**
✅ **Analisa as cenas usando YOLO e gera descrições automáticas**
✅ **Evita repetições desnecessárias no feedback da IA**
✅ **Mantém as streams estáveis para evitar travamentos**
✅ **Suporte a reconexão automática das câmeras**

---

## **⚠️ Solução de Problemas**

### **FFmpeg não encontrado?**

Instale o FFmpeg:

```sh
sudo apt install ffmpeg  # Ubuntu/Debian
brew install ffmpeg      # macOS
choco install ffmpeg     # Windows (via Chocolatey)
```

### **Python não reconhecido?**

Verifique se está instalado:

```sh
python3 --version
```

Se não estiver, instale a versão mais recente de [python.org](https://www.python.org/downloads/).

---

Agora é só rodar e monitorar! 🚀
