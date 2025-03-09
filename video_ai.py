import cv2
import torch
import numpy as np
import threading
from ultralytics import YOLO

# Carregar modelo YOLO pré-treinado
model = YOLO("yolov5s.pt")

# Mapeamento de feedback por câmera
previous_feedback = {
    "video1": None,
    "video2": None,
    "video3": None,
    "video4": None
}

# URLs dos streams
streams = {
    "video1": "http://localhost:3000/stream1.m3u8",
    "video2": "http://localhost:3000/stream2.m3u8",
    "video3": "http://localhost:3000/stream3.m3u8",
    "video4": "http://localhost:3000/stream4.m3u8"
}

# Função para gerar descrição do vídeo
def analyze_frame(frame):
    results = model(frame)
    labels = results[0].names

    detected_objects = []
    for obj in results[0].boxes:
        class_id = int(obj.cls)
        detected_objects.append(labels[class_id])

    if not detected_objects:
        return "Nada está acontecendo."

    return f"Detectado: {', '.join(set(detected_objects))}"

# Loop para cada stream
def analyze_stream(video_id, stream_url):
    global previous_feedback

    cap = cv2.VideoCapture(stream_url)
    if not cap.isOpened():
        print(f"Erro ao abrir {stream_url}")
        return
    
    print(f"📡 Analisando {video_id}...")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        feedback = analyze_frame(frame)

        if feedback != previous_feedback[video_id]:
            with open(f"public/{video_id}.txt", "w") as f:
                f.write(feedback)
            previous_feedback[video_id] = feedback
        
        cv2.waitKey(1000)  # Espera 1 segundo antes do próximo frame

    cap.release()

# Criar threads para cada stream
threads = []
for video_id, stream_url in streams.items():
    thread = threading.Thread(target=analyze_stream, args=(video_id, stream_url))
    thread.start()
    threads.append(thread)

# Aguarda todas as threads terminarem
for thread in threads:
    thread.join()
