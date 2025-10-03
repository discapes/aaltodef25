from __future__ import annotations

"""YOLOv8 streaming example using Roboflow's inference pipeline."""

from inference import InferencePipeline
from inference.core.interfaces.stream.sinks import render_boxes


MODEL_ID = "yolov8n-640"
VIDEO_REFERENCE = 0  # default webcam; adjust to a path or stream URL if needed


def main() -> None:
    pipeline = InferencePipeline.init(
        model_id=MODEL_ID,
        video_reference=VIDEO_REFERENCE,
        on_prediction=render_boxes,
    )

    pipeline.start()
    pipeline.join()


if __name__ == "__main__":
    main()
