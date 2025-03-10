import cv2
import torch
import numpy as np
import threading
import random
import time
from ultralytics import YOLO

# Carregar modelo YOLO pré-treinado
model = YOLO("yolov5s.pt")

# Histórico de análise por câmera
previous_feedback = {
    "video1": None,
    "video2": None,
    "video3": None,
    "video4": None
}

object_count_history = {
    "video1": {},
    "video2": {},
    "video3": {},
    "video4": {}
}

# URLs dos streams
streams = {
    "video1": "http://localhost:3000/stream1.m3u8",
    "video2": "http://localhost:3000/stream2.m3u8",
    "video3": "http://localhost:3000/stream3.m3u8",
    "video4": "http://localhost:3000/stream4.m3u8"
}

# Limpa o histórico no início do script
for video_id in streams.keys():
    with open(f"public/{video_id}.txt", "w") as f:
        f.write("")

# Função para construir uma frase mais natural
def generate_dynamic_description(detected_objects, previous_objects):
    descriptions = []

    if not detected_objects:
        return random.choice([
            "A cena está vazia.",
            "Nada de interessante acontecendo no momento.",
            "O ambiente está tranquilo."
        ])

    for obj, count in detected_objects.items():
        previous_count = previous_objects.get(obj, 0)

        # Se o número aumentou, alguém entrou na cena
        if count > previous_count:
            if count == 1:
                descriptions.append(f"Um {obj} apareceu.")
            else:
                descriptions.append(f"{count - previous_count} {obj}s entraram na cena.")

        # Se o número diminuiu, algo saiu da cena
        elif count < previous_count:
            if previous_count == 1:
                descriptions.append(f"O {obj} saiu da cena.")
            else:
                descriptions.append(f"{previous_count - count} {obj}s saíram da cena.")

        # Se a quantidade se manteve, mas houve movimento, adicionar contexto
        else:
            descriptions.append(f"Há {count} {obj}s no local.")

    if descriptions:
        return random.choice([
            "Parece que algo mudou: " + ", ".join(descriptions),
            "Atualização na cena: " + ", ".join(descriptions),
            "Mudança detectada: " + ", ".join(descriptions),
            "O que estou vendo agora: " + ", ".join(descriptions)
        ])

    return "Nada mudou na cena."

# Função para processar um frame
def analyze_frame(frame, video_id):
    results = model(frame)
    labels = results[0].names
    detected_objects = {}

    for obj in results[0].boxes:
        class_id = int(obj.cls)
        label = labels[class_id]
        detected_objects[label] = detected_objects.get(label, 0) + 1

    # Criar descrição dinâmica baseada na comparação com o estado anterior
    feedback = generate_dynamic_description(detected_objects, object_count_history[video_id])

    # Atualizar histórico de detecção
    object_count_history[video_id] = detected_objects

    return feedback

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

        feedback = analyze_frame(frame, video_id)

        # Adicionar timestamp ao feedback
        timestamp = time.strftime("[%H:%M:%S]")
        entry = f"{timestamp} {feedback}\n"

        # Escrever no arquivo de histórico sem sobrescrever
        if feedback != previous_feedback[video_id]:
            with open(f"public/{video_id}.txt", "a") as f:
                f.write(entry)
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
