"""Foreground masks, independent from geometry and texture padding."""
import cv2
import numpy as np
from PIL import Image


def segment_object(image: Image.Image):
    if image.mode in ("P", "LA"):
        image = image.convert("RGBA")
    rgb = np.asarray(image.convert("RGB"))
    h, w = rgb.shape[:2]
    alpha = np.asarray(image.getchannel("A")) if image.mode == "RGBA" else None
    if alpha is not None and alpha.min() < 250:
        # Preserve alpha holes; never close them into valid texture pixels.
        mask = (alpha >= 250).astype(np.uint8)
    else:
        scale = min(1.0, 900 / max(h, w))
        small = cv2.resize(rgb, (round(w * scale), round(h * scale)))
        sh, sw = small.shape[:2]
        if min(sh, sw) < 24:
            raise ValueError("Ảnh quá nhỏ để tách nền.")
        lab = cv2.cvtColor(small, cv2.COLOR_RGB2LAB).astype(np.float32)
        border = np.concatenate([lab[:3].reshape(-1, 3), lab[-3:].reshape(-1, 3),
                                 lab[:, :3].reshape(-1, 3), lab[:, -3:].reshape(-1, 3)])
        cv2.setRNGSeed(0)
        _, _, colors = cv2.kmeans(border, 5, None,
            (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 40, 0.2), 1, cv2.KMEANS_PP_CENTERS)
        distance = np.min(np.linalg.norm(lab[:, :, None] - colors, axis=3), axis=2)
        similar = (distance < 14).astype(np.uint8)
        _, components = cv2.connectedComponents(similar)
        edge_labels = np.unique(np.concatenate([components[0], components[-1], components[:, 0], components[:, -1]]))
        background = np.isin(components, edge_labels[edge_labels != 0])
        seed = ((distance > 23) & ~background).astype(np.uint8)
        count, labels, stats, _ = cv2.connectedComponentsWithStats(seed, 8)
        if count < 2:
            raise ValueError("Không tách được sản phẩm khỏi nền. Hãy dùng ảnh nền trơn hoặc PNG tách nền.")
        seed = (labels == 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])).astype(np.uint8)
        seed = cv2.erode(seed, np.ones((3, 3), np.uint8))
        gc = np.full((sh, sw), cv2.GC_PR_BGD, np.uint8)
        gc[distance > 14] = cv2.GC_PR_FGD
        gc[background] = cv2.GC_BGD
        gc[seed > 0] = cv2.GC_FGD
        gc[[0, -1], :] = cv2.GC_BGD
        gc[:, [0, -1]] = cv2.GC_BGD
        cv2.grabCut(small, gc, None, np.zeros((1, 65)), np.zeros((1, 65)), 5, cv2.GC_INIT_WITH_MASK)
        mask = cv2.resize(np.isin(gc, [cv2.GC_FGD, cv2.GC_PR_FGD]).astype(np.uint8),
                          (w, h), interpolation=cv2.INTER_NEAREST)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
    if count < 2:
        raise ValueError("Không tìm thấy foreground hợp lệ.")
    mask = (labels == 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])).astype(np.uint8)
    if mask.mean() < 0.015 or mask.mean() > 0.9:
        raise ValueError("Mask không hợp lệ; hãy chụp toàn bộ sản phẩm trên nền trơn.")
    return rgb, mask
