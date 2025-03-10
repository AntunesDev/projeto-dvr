import cv2
import numpy as np
import torch
import time
import threading
import base64
import json
import websocket

from ultralytics import YOLO

# Carregar modelo YOLO pré-treinado
model = YOLO("yolov5su.pt")

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

# Limpa os arquivos de log no início do script
for video_id in previous_feedback.keys():
    with open(f"public/{video_id}.txt", "w") as f:
        f.write("")

# Conecta ao WebSocket do servidor Node.js
WS_URL = "ws://localhost:3000"

# Converte base64 para frame OpenCV
def decode_frame(base64_data):
    img_bytes = base64.b64decode(base64_data)
    np_arr = np.frombuffer(img_bytes, dtype=np.uint8)
    return cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

# Função para gerar descrição detalhada
def generate_dynamic_description(detected_objects, previous_objects):
    descriptions = []

    if not detected_objects:
        return "A cena está vazia."

    for obj, count in detected_objects.items():
        previous_count = previous_objects.get(obj, 0)

        if count > previous_count:
            if count == 1:
                descriptions.append(f"Um {obj} apareceu.")
            else:
                descriptions.append(f"{count - previous_count} {obj}s entraram na cena.")

        elif count < previous_count:
            if previous_count == 1:
                descriptions.append(f"O {obj} saiu da cena.")
            else:
                descriptions.append(f"{previous_count - count} {obj}s saíram da cena.")

        else:
            descriptions.append(f"Há {count} {obj}s no local.")

    return "Mudança detectada: " + ", ".join(descriptions) if descriptions else None

# Função para processar um frame
def analyze_frame(frame, video_id):
    results = model(frame)
    labels = results[0].names
    detected_objects = {}

    for obj in results[0].boxes:
        class_id = int(obj.cls)
        label = labels[class_id]
        detected_objects[label] = detected_objects.get(label, 0) + 1

    # Criar descrição baseada na comparação com o estado anterior
    feedback = generate_dynamic_description(detected_objects, object_count_history[video_id])

    # Atualizar histórico de detecção
    object_count_history[video_id] = detected_objects

    return feedback

# Função para processar mensagens WebSocket
def on_message(ws, message):
    global previous_feedback

    data = json.loads(message)
    channel = data["channel"]
    frame = decode_frame(data["frame"])

    feedback = analyze_frame(frame, channel)

    # Apenas registrar mudanças reais
    if feedback and feedback != previous_feedback[channel]:
        timestamp = time.strftime("[%H:%M:%S]")
        entry = f"{timestamp} {feedback}\n"

        with open(f"public/{channel}.txt", "a") as f:
            f.write(entry)

        previous_feedback[channel] = feedback

# Configurações do WebSocket
def start_websocket():
    ws = websocket.WebSocketApp(WS_URL, on_message=on_message)
    ws.run_forever()

# Criar thread para o WebSocket
threading.Thread(target=start_websocket, daemon=True).start()

while True:
    time.sleep(1)