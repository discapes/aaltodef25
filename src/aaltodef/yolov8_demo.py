"""Minimal YOLOv8 inference demo using the Roboflow inference SDK."""

from __future__ import annotations

from inference import get_model
from inference.core.utils.image_utils import load_image_bgr
import supervision as sv

IMAGE_URL = "https://media.roboflow.com/inference/vehicles.png"
MODEL_ID = "yolov8n-640"

def main() -> None:
    """Download an example image, run detection, and plot annotations."""
    image = load_image_bgr(IMAGE_URL)

    model = get_model(model_id=MODEL_ID)
    results = model.infer(image)[0]
    detections = sv.Detections.from_inference(results)

    box_annotator = sv.BoxAnnotator(thickness=4)
    annotated = box_annotator.annotate(image.copy(), detections)

    label_annotator = sv.LabelAnnotator(text_scale=2, text_thickness=2)
    annotated = label_annotator.annotate(annotated, detections)

    sv.plot_image(annotated)


if __name__ == "__main__":
    main()
