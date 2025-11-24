import { useState } from "react";
import "./App.css";
import Box, { type Position, type Size } from "./Box";
import bgJPG from "./assets/bg.jpg";

const imgSize = { width: 5120, height: 2880 };
const aspect = imgSize.width / imgSize.height;

const applyScale = (
  current: Position & Size,
  centerX: number,
  centerY: number,
  ratio: number
): Position & Size => {
  // 以 (centerX, centerY) 为缩放中心对 current 进行缩放
  // 新的宽高
  const newWidth = current.width * ratio;
  const newHeight = current.height * ratio;

  // 缩放中心相对于 current 的偏移
  const offsetX = centerX - current.x;
  const offsetY = centerY - current.y;

  // 缩放后，保持缩放中心在同一位置
  // 新的位置 = 缩放中心 - (偏移 * 缩放比例)
  const newX = centerX - offsetX * ratio;
  const newY = centerY - offsetY * ratio;

  return {
    x: newX,
    y: newY,
    width: newWidth,
    height: newHeight,
  };
};

export function App() {
  const [focus, setFocus] = useState<"clip" | "img">("clip");

  const [clip, setClip] = useState<Position & Size>({
    x: 100,
    y: 100,
    width: 400,
    height: 300,
  });

  const [img, setImg] = useState<Position & Size>(() => {
    const clipAspect = clip.width / clip.height;
    let x, y, width, height;
    if (clipAspect > aspect) {
      // clip is wider than image
      width = clip.width;
      height = width / aspect;
      x = clip.x;
      y = clip.y - (height - clip.height) / 2;
    } else {
      // clip is taller than image
      height = clip.height;
      width = height * aspect;
      y = clip.y;
      x = clip.x - (width - clip.width) / 2;
    }
    return { x, y, width, height };
  });

  const [scale, setScale] = useState({ dx: 0, dy: 0, ratio: 1 });

  const newImg = applyScale(
    img,
    img.x + img.width / 2,
    img.y + img.height / 2,
    scale.ratio
  );
  newImg.x += scale.dx;
  newImg.y += scale.dy;

  const [startBox, setStartBox] = useState<Position & Size>({ ...newImg });

  return (
    <div
      style={{ height: "100%" }}
      onDoubleClick={() => {
        setFocus(focus === "clip" ? "img" : "clip");
        setImg(newImg);
        setScale({ dx: 0, dy: 0, ratio: 1 });
      }}
    >
      <Box
        data={newImg}
        setData={setImg}
        active={focus === "img"}
        aspect={aspect}
        innerBox={clip}
      >
        <div
          style={{
            backgroundSize: "contain",
            backgroundImage: `url(${bgJPG})`,
            backgroundPosition: `center`,
            backgroundRepeat: "no-repeat",
            width: "100%",
            height: "100%",
            opacity: 0.3,
            maskImage: `
              linear-gradient(#000 0 0),
              linear-gradient(#000 0 0)
            `,
            maskComposite: "exclude",
            maskPosition: `
              0 0,
              ${clip.x - newImg.x}px ${clip.y - newImg.y}px
            `,
            maskSize: `
              100% 100%,
              ${clip.width}px ${clip.height}px
            `,
            maskRepeat: "no-repeat",
          }}
        ></div>
        <div
          style={{
            position: "absolute",
            left: `${clip.x - newImg.x}px`,
            top: `${clip.y - newImg.y}px`,
            width: `${clip.width}px`,
            height: `${clip.height}px`,
            backgroundImage: `url(${bgJPG})`,
            backgroundPosition: `${-(clip.x - newImg.x)}px ${-(
              clip.y - newImg.y
            )}px`,
            backgroundRepeat: "no-repeat",
            backgroundSize: `${newImg.width}px ${newImg.height}px`,
          }}
        ></div>
      </Box>

      <Box
        data={clip}
        setData={setClip}
        active={focus === "clip"}
        onMove={(dx, dy) => {
          setImg((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
        }}
        onResize={(dx, dy, ratio) => {
          const newImg = applyScale(
            img,
            clip.x + clip.width / 2 - scale.dx,
            clip.y + clip.height / 2 - scale.dy,
            ratio
          );
          newImg.x += dx;
          newImg.y += dy;

          setImg(newImg);
        }}
        onStart={() => {
          setStartBox({ ...newImg });
        }}
        onResize2={(newState, mode) => {
          if (mode === "resize-l") {
            console.log("resize-l", newState, startBox);
            if (newState.x < startBox.x) {
              const delta = newImg.x - newState.x;
              const ratio = newState.width / (newState.width - delta);

              const scaleCenter = {
                x: newState.x + newState.width,
                y: newState.y + newState.height / 2,
              };

              const imgCenter = {
                x: newImg.x + newImg.width / 2,
                y: newImg.y + newImg.height / 2,
              };

              // 需要考虑四个方向的覆盖
              // const topOffset = newImg.y - scaleCenter.y;
              // const bottomOffset = newImg.y + newImg.height - scaleCenter.y;
              // const leftOffset = newImg.x - scaleCenter.x;
              // const rightOffset = newImg.x + newImg.width - scaleCenter.x;

              // let minRatioForCoverage = 0;
              // if (topOffset !== 0) {
              //   const r1 = (newState.y - scaleCenter.y) / topOffset;
              //   minRatioForCoverage = Math.max(minRatioForCoverage, r1);
              // }
              // if (bottomOffset !== 0) {
              //   const r2 =
              //     (newState.y + newState.height - scaleCenter.y) / bottomOffset;
              //   minRatioForCoverage = Math.max(minRatioForCoverage, r2);
              // }
              // if (leftOffset !== 0) {
              //   const r3 = (newState.x - scaleCenter.x) / leftOffset;
              //   minRatioForCoverage = Math.max(minRatioForCoverage, r3);
              // }
              // if (rightOffset !== 0) {
              //   const r4 =
              //     (newState.x + newState.width - scaleCenter.x) / rightOffset;
              //   minRatioForCoverage = Math.max(minRatioForCoverage, r4);
              // }

              const finalRatio = ratio;

              const offsetX = imgCenter.x - scaleCenter.x;
              const offsetY = imgCenter.y - scaleCenter.y;

              const newImgCenter = {
                x: scaleCenter.x + offsetX * finalRatio,
                y: scaleCenter.y + offsetY * finalRatio,
              };

              const dx = newImgCenter.x - imgCenter.x;
              const dy = newImgCenter.y - imgCenter.y;

              setScale((prev) => ({
                dx: prev.dx + dx,
                dy: prev.dy + dy,
                ratio: prev.ratio * finalRatio,
              }));
            }
          } else if (mode === "resize-r") {
            console.log("resize-r", newState, startBox);
            if (newState.x + newState.width > startBox.x + startBox.width) {
              const delta =
                newState.x + newState.width - (newImg.x + newImg.width);
              const ratio = newState.width / (newState.width - delta);

              const scaleCenter = {
                x: newState.x,
                y: newState.y + newState.height / 2,
              };

              const imgCenter = {
                x: newImg.x + newImg.width / 2,
                y: newImg.y + newImg.height / 2,
              };

              // const topOffset = newImg.y - scaleCenter.y;
              // const bottomOffset = newImg.y + newImg.height - scaleCenter.y;
              // const leftOffset = newImg.x - scaleCenter.x;
              // const rightOffset = newImg.x + newImg.width - scaleCenter.x;

              // let minRatioForCoverage = 0;
              // if (topOffset !== 0) {
              //   const r1 = (newState.y - scaleCenter.y) / topOffset;
              //   minRatioForCoverage = Math.max(minRatioForCoverage, r1);
              // }
              // if (bottomOffset !== 0) {
              //   const r2 =
              //     (newState.y + newState.height - scaleCenter.y) / bottomOffset;
              //   minRatioForCoverage = Math.max(minRatioForCoverage, r2);
              // }
              // if (leftOffset !== 0) {
              //   const r3 = (newState.x - scaleCenter.x) / leftOffset;
              //   minRatioForCoverage = Math.max(minRatioForCoverage, r3);
              // }
              // if (rightOffset !== 0) {
              //   const r4 =
              //     (newState.x + newState.width - scaleCenter.x) / rightOffset;
              //   minRatioForCoverage = Math.max(minRatioForCoverage, r4);
              // }

              const finalRatio = ratio;

              const offsetX = imgCenter.x - scaleCenter.x;
              const offsetY = imgCenter.y - scaleCenter.y;

              const newImgCenter = {
                x: scaleCenter.x + offsetX * finalRatio,
                y: scaleCenter.y + offsetY * finalRatio,
              };

              const dx = newImgCenter.x - imgCenter.x;
              const dy = newImgCenter.y - imgCenter.y;

              setScale((prev) => ({
                dx: prev.dx + dx,
                dy: prev.dy + dy,
                ratio: prev.ratio * finalRatio,
              }));
            }
          } else if (mode === "resize-t") {
            if (newState.y < startBox.y) {
              const delta = newImg.y - newState.y;
              const ratio = newState.height / (newState.height - delta);

              const scaleCenter = {
                x: newState.x + newState.width / 2,
                y: newState.y + newState.height,
              };

              const imgCenter = {
                x: newImg.x + newImg.width / 2,
                y: newImg.y + newImg.height / 2,
              };

              // const topOffset = newImg.y - scaleCenter.y;
              // const bottomOffset = newImg.y + newImg.height - scaleCenter.y;
              // const leftOffset = newImg.x - scaleCenter.x;
              // const rightOffset = newImg.x + newImg.width - scaleCenter.x;

              // let minRatioForCoverage = 0;
              // if (topOffset !== 0) {
              //   const r1 = (newState.y - scaleCenter.y) / topOffset;
              //   minRatioForCoverage = Math.max(minRatioForCoverage, r1);
              // }
              // if (bottomOffset !== 0) {
              //   const r2 =
              //     (newState.y + newState.height - scaleCenter.y) / bottomOffset;
              //   minRatioForCoverage = Math.max(minRatioForCoverage, r2);
              // }
              // if (leftOffset !== 0) {
              //   const r3 = (newState.x - scaleCenter.x) / leftOffset;
              //   minRatioForCoverage = Math.max(minRatioForCoverage, r3);
              // }
              // if (rightOffset !== 0) {
              //   const r4 =
              //     (newState.x + newState.width - scaleCenter.x) / rightOffset;
              //   minRatioForCoverage = Math.max(minRatioForCoverage, r4);
              // }

              const finalRatio = ratio;

              const offsetX = imgCenter.x - scaleCenter.x;
              const offsetY = imgCenter.y - scaleCenter.y;

              const newImgCenter = {
                x: scaleCenter.x + offsetX * finalRatio,
                y: scaleCenter.y + offsetY * finalRatio,
              };

              const dx = newImgCenter.x - imgCenter.x;
              const dy = newImgCenter.y - imgCenter.y;

              setScale((prev) => ({
                dx: prev.dx + dx,
                dy: prev.dy + dy,
                ratio: prev.ratio * finalRatio,
              }));
            }
          } else if (mode === "resize-b") {
            if (newState.y + newState.height > startBox.y + startBox.height) {
              const delta =
                newState.y + newState.height - (newImg.y + newImg.height);
              const ratio = newState.height / (newState.height - delta);

              const scaleCenter = {
                x: newState.x + newState.width / 2,
                y: newState.y,
              };

              const imgCenter = {
                x: newImg.x + newImg.width / 2,
                y: newImg.y + newImg.height / 2,
              };

              // const topOffset = newImg.y - scaleCenter.y;
              // const bottomOffset = newImg.y + newImg.height - scaleCenter.y;
              // const leftOffset = newImg.x - scaleCenter.x;
              // const rightOffset = newImg.x + newImg.width - scaleCenter.x;

              // let minRatioForCoverage = 0;
              // if (topOffset !== 0) {
              //   const r1 = (newState.y - scaleCenter.y) / topOffset;
              //   minRatioForCoverage = Math.max(minRatioForCoverage, r1);
              // }
              // if (bottomOffset !== 0) {
              //   const r2 =
              //     (newState.y + newState.height - scaleCenter.y) / bottomOffset;
              //   minRatioForCoverage = Math.max(minRatioForCoverage, r2);
              // }
              // if (leftOffset !== 0) {
              //   const r3 = (newState.x - scaleCenter.x) / leftOffset;
              //   minRatioForCoverage = Math.max(minRatioForCoverage, r3);
              // }
              // if (rightOffset !== 0) {
              //   const r4 =
              //     (newState.x + newState.width - scaleCenter.x) / rightOffset;
              //   minRatioForCoverage = Math.max(minRatioForCoverage, r4);
              // }

              const finalRatio = ratio;

              const offsetX = imgCenter.x - scaleCenter.x;
              const offsetY = imgCenter.y - scaleCenter.y;

              const newImgCenter = {
                x: scaleCenter.x + offsetX * finalRatio,
                y: scaleCenter.y + offsetY * finalRatio,
              };

              const dx = newImgCenter.x - imgCenter.x;
              const dy = newImgCenter.y - imgCenter.y;

              setScale((prev) => ({
                dx: prev.dx + dx,
                dy: prev.dy + dy,
                ratio: prev.ratio * finalRatio,
              }));
            }
          }
        }}
        aspect={clip.width / clip.height}
      ></Box>

      <div
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          opacity: 0.6,
        }}
      >
        <p>双击切换选中区域（裁剪区域/图片区域）</p>
      </div>
    </div>
  );
}
