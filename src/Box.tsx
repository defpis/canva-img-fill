import { useEffect, useRef } from "react";
import { fromEvent, map, switchMap, takeUntil } from "rxjs";

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export default function Box({
  children,
  aspect,
  data,
  setData,
  active = true,
  innerBox,
  onMove,
  onResize,
  onResize2,
}: {
  children?: React.ReactNode;
  aspect?: number;
  data: Position & Size;
  setData?: (action: React.SetStateAction<Position & Size>) => void;
  active?: boolean;
  innerBox?: Position & Size;
  onMove?: (dx: number, dy: number) => void;
  onResize?: (dx: number, dy: number, scale: number) => void;
  onResize2?: (
    oldState: Position & Size,
    newState: Position & Size,
    mode: string
  ) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const setDataRef = useRef(setData);
  const onMoveRef = useRef(onMove);
  const onResizeRef = useRef(onResize);
  const onResize2Ref = useRef(onResize2);
  const aspectRef = useRef(aspect);
  const innerBoxRef = useRef(innerBox);

  useEffect(() => {
    setDataRef.current = setData;
    onMoveRef.current = onMove;
    onResizeRef.current = onResize;
    onResize2Ref.current = onResize2;
    aspectRef.current = aspect;
    innerBoxRef.current = innerBox;
  });

  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    if (!container) return;

    const mouseDown$ = fromEvent<MouseEvent>(container, "mousedown");
    const mouseMove$ = fromEvent<MouseEvent>(document, "mousemove");
    const mouseUp$ = fromEvent<MouseEvent>(document, "mouseup");

    let lastX = 0;
    let lastY = 0;

    const parent = container.parentNode as HTMLDivElement;

    const drag$ = mouseDown$.pipe(
      switchMap((startEvent) => {
        const target = startEvent.target as HTMLElement;

        let mode: string;
        if (target.classList.contains("move")) {
          mode = "move";
        } else if (target.classList.contains("resize-tl")) {
          mode = "resize-tl";
        } else if (target.classList.contains("resize-tr")) {
          mode = "resize-tr";
        } else if (target.classList.contains("resize-bl")) {
          mode = "resize-bl";
        } else if (target.classList.contains("resize-br")) {
          mode = "resize-br";
        } else if (target.classList.contains("resize-l")) {
          mode = "resize-l";
        } else if (target.classList.contains("resize-t")) {
          mode = "resize-t";
        } else if (target.classList.contains("resize-r")) {
          mode = "resize-r";
        } else if (target.classList.contains("resize-b")) {
          mode = "resize-b";
        } else {
          return [];
        }

        const parentRect = parent.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();

        const offsetX = startEvent.clientX - targetRect.left;
        const offsetY = startEvent.clientY - targetRect.top;

        lastX = startEvent.clientX;
        lastY = startEvent.clientY;

        return mouseMove$.pipe(
          map((moveEvent) => {
            const x = moveEvent.clientX - offsetX - parentRect.left;
            const y = moveEvent.clientY - offsetY - parentRect.top;

            const dx = moveEvent.clientX - lastX;
            const dy = moveEvent.clientY - lastY;

            lastX = moveEvent.clientX;
            lastY = moveEvent.clientY;

            return { x, y, dx, dy, mode };
          }),
          takeUntil(mouseUp$)
        );
      })
    );

    const move = (prev: Position & Size, x: number, y: number) => {
      const innerBox = innerBoxRef.current;

      // 这里调用 onMove 会触发两次导致两倍移动
      // onMove?.(dx, dy);

      if (innerBox) {
        const minX = innerBox.x;
        const minY = innerBox.y;
        const maxX = innerBox.x + innerBox.width;
        const maxY = innerBox.y + innerBox.height;

        let newX = x + prev.width < maxX ? maxX - prev.width : x;
        let newY = y + prev.height < maxY ? maxY - prev.height : y;

        newX = newX > minX ? minX : newX;
        newY = newY > minY ? minY : newY;

        return {
          x: newX,
          y: newY,
          width: prev.width,
          height: prev.height,
        };
      }

      return {
        x,
        y,
        width: prev.width,
        height: prev.height,
      };

      // 保持在父容器内的逻辑，先注释掉
      // const minX = x;
      // const minY = y;
      // const maxX = minX + prev.width;
      // const maxY = minY + prev.height;

      // let newX =
      //   maxX > parent.clientWidth ? parent.clientWidth - prev.width : minX;
      // let newY =
      //   maxY > parent.clientHeight
      //     ? parent.clientHeight - prev.height
      //     : minY;

      // newX = newX < 0 ? 0 : newX;
      // newY = newY < 0 ? 0 : newY;

      // return {
      //   x: newX,
      //   y: newY,
      //   width: prev.width,
      //   height: prev.height,
      // };
    };

    const minSize = 100;
    let newX: number;
    let newY: number;
    let newWidth: number;
    let newHeight: number;

    const resizeTopLeft = (
      prev: Position & Size,
      x: number,
      y: number,
      aspect?: number
    ) => {
      const innerBox = innerBoxRef.current;

      const anchorX = prev.x + prev.width;
      const anchorY = prev.y + prev.height;

      if (aspect) {
        const dx = x - anchorX;
        const dy = y - anchorY;

        const diagonalLength = Math.sqrt(aspect * aspect + 1);
        const projection = (dx * aspect + dy) / diagonalLength;

        const projectionAbs = Math.abs(projection);
        newWidth = (projectionAbs * aspect) / diagonalLength;
        newHeight = projectionAbs / diagonalLength;

        let minWidth = minSize;
        let minHeight = minSize;

        if (innerBox) {
          const minX = innerBox.x;
          const minY = innerBox.y;

          minWidth = anchorX - minX;
          minHeight = anchorY - minY;

          if (minWidth / minHeight > aspect) {
            minHeight = minWidth / aspect;
          } else {
            minWidth = minHeight * aspect;
          }
        }

        if (newWidth < minWidth) {
          newWidth = minWidth;
          newHeight = newWidth / aspect;
        }

        newX = anchorX - newWidth;
        newY = anchorY - newHeight;
      } else {
        let minWidth = minSize;
        let minHeight = minSize;

        if (innerBox) {
          const minX = innerBox.x;
          const minY = innerBox.y;

          minWidth = anchorX - minX;
          minHeight = anchorY - minY;
        }

        newX = anchorX - x < minWidth ? anchorX - minWidth : x;
        newY = anchorY - y < minHeight ? anchorY - minHeight : y;
        newWidth = anchorX - newX;
        newHeight = anchorY - newY;
      }

      return {
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
      };
    };

    const resizeTopRight = (
      prev: Position & Size,
      x: number,
      y: number,
      aspect?: number
    ) => {
      const innerBox = innerBoxRef.current;

      const anchorX = prev.x;
      const anchorY = prev.y + prev.height;

      if (aspect) {
        const dx = x - anchorX;
        const dy = y - anchorY;

        const diagonalLength = Math.sqrt(aspect * aspect + 1);
        const projection = (dx * aspect - dy) / diagonalLength;

        const projectionAbs = Math.abs(projection);
        newWidth = (projectionAbs * aspect) / diagonalLength;
        newHeight = projectionAbs / diagonalLength;

        let minWidth = minSize;
        let minHeight = minSize;

        if (innerBox) {
          const maxX = innerBox.x + innerBox.width;
          const minY = innerBox.y;

          minWidth = maxX - anchorX;
          minHeight = anchorY - minY;

          if (minWidth / minHeight > aspect) {
            minHeight = minWidth / aspect;
          } else {
            minWidth = minHeight * aspect;
          }
        }

        if (newWidth < minWidth) {
          newWidth = minWidth;
          newHeight = newWidth / aspect;
        }

        newX = anchorX;
        newY = anchorY - newHeight;
      } else {
        let minWidth = minSize;
        let minHeight = minSize;

        if (innerBox) {
          const maxX = innerBox.x + innerBox.width;
          const minY = innerBox.y;

          minWidth = maxX - anchorX;
          minHeight = anchorY - minY;
        }

        newX = x - anchorX < minWidth ? anchorX + minWidth : x;
        newY = anchorY - y < minHeight ? anchorY - minHeight : y;
        newWidth = newX - anchorX;
        newHeight = anchorY - newY;
      }

      return {
        x: anchorX,
        y: newY,
        width: newWidth,
        height: newHeight,
      };
    };

    const resizeBottomLeft = (
      prev: Position & Size,
      x: number,
      y: number,
      aspect?: number
    ) => {
      const innerBox = innerBoxRef.current;

      const anchorX = prev.x + prev.width;
      const anchorY = prev.y;

      if (aspect) {
        const dx = x - anchorX;
        const dy = y - anchorY;

        const diagonalLength = Math.sqrt(aspect * aspect + 1);
        const projection = (-dx * aspect + dy) / diagonalLength;

        const projectionAbs = Math.abs(projection);
        newWidth = (projectionAbs * aspect) / diagonalLength;
        newHeight = projectionAbs / diagonalLength;

        let minWidth = minSize;
        let minHeight = minSize;

        if (innerBox) {
          const minX = innerBox.x;
          const maxY = innerBox.y + innerBox.height;

          minWidth = anchorX - minX;
          minHeight = maxY - anchorY;

          if (minWidth / minHeight > aspect) {
            minHeight = minWidth / aspect;
          } else {
            minWidth = minHeight * aspect;
          }
        }

        if (newWidth < minWidth) {
          newWidth = minWidth;
          newHeight = newWidth / aspect;
        }

        newX = anchorX - newWidth;
        newY = anchorY;
      } else {
        let minWidth = minSize;
        let minHeight = minSize;

        if (innerBox) {
          const minX = innerBox.x;
          const maxY = innerBox.y + innerBox.height;

          minWidth = anchorX - minX;
          minHeight = maxY - anchorY;
        }

        newX = anchorX - x < minWidth ? anchorX - minWidth : x;
        newY = y - anchorY < minHeight ? anchorY + minHeight : y;
        newWidth = anchorX - newX;
        newHeight = newY - anchorY;
      }

      return {
        x: newX,
        y: anchorY,
        width: newWidth,
        height: newHeight,
      };
    };

    const resizeBottomRight = (
      prev: Position & Size,
      x: number,
      y: number,
      aspect?: number
    ) => {
      const innerBox = innerBoxRef.current;

      const anchorX = prev.x;
      const anchorY = prev.y;

      if (aspect) {
        const dx = x - anchorX;
        const dy = y - anchorY;

        const diagonalLength = Math.sqrt(aspect * aspect + 1);
        const projection = (dx * aspect + dy) / diagonalLength;

        const projectionAbs = Math.abs(projection);
        newWidth = (projectionAbs * aspect) / diagonalLength;
        newHeight = projectionAbs / diagonalLength;

        let minWidth = minSize;
        let minHeight = minSize;

        if (innerBox) {
          const maxX = innerBox.x + innerBox.width;
          const maxY = innerBox.y + innerBox.height;

          minWidth = maxX - anchorX;
          minHeight = maxY - anchorY;

          if (minWidth / minHeight > aspect) {
            minHeight = minWidth / aspect;
          } else {
            minWidth = minHeight * aspect;
          }
        }

        if (newWidth < minWidth) {
          newWidth = minWidth;
          newHeight = newWidth / aspect;
        }

        newX = anchorX;
        newY = anchorY;
      } else {
        let minWidth = minSize;
        let minHeight = minSize;

        if (innerBox) {
          const maxX = innerBox.x + innerBox.width;
          const maxY = innerBox.y + innerBox.height;

          minWidth = maxX - anchorX;
          minHeight = maxY - anchorY;
        }

        newX = x - anchorX < minWidth ? anchorX + minWidth : x;
        newY = y - anchorY < minHeight ? anchorY + minHeight : y;
        newWidth = newX - anchorX;
        newHeight = newY - anchorY;
      }

      return {
        x: anchorX,
        y: anchorY,
        width: newWidth,
        height: newHeight,
      };
    };

    const subscription = drag$.subscribe(({ x, y, mode }) => {
      let first = true;
      setDataRef.current?.((prev) => {
        let newState = prev;

        const _onMove = (newState: Position & Size) => {
          if (first) {
            onMoveRef.current?.(newState.x - prev.x, newState.y - prev.y);
            first = false;
          }
        };

        const _onResize = (newState: Position & Size) => {
          if (first) {
            onResizeRef.current?.(
              newState.x + newState.width / 2 - (prev.x + prev.width / 2),
              newState.y + newState.height / 2 - (prev.y + prev.height / 2),
              newState.width / prev.width
            );
            first = false;
          }
        };

        const onResize2 = onResize2Ref.current;

        if (mode === "move") {
          newState = move(prev, x, y);
          _onMove(newState);
        } else if (mode === "resize-tl") {
          newState = resizeTopLeft(prev, x, y, aspectRef.current);
          _onResize(newState);
        } else if (mode === "resize-tr") {
          newState = resizeTopRight(prev, x, y, aspectRef.current);
          _onResize(newState);
        } else if (mode === "resize-bl") {
          newState = resizeBottomLeft(prev, x, y, aspectRef.current);
          _onResize(newState);
        } else if (mode === "resize-br") {
          newState = resizeBottomRight(prev, x, y, aspectRef.current);
          _onResize(newState);
        } else if (mode === "resize-l") {
          newState = resizeTopLeft(
            prev,
            x,
            prev.y,
            onResize2 ? undefined : aspectRef.current
          );
          if (first) {
            onResize2?.(prev, newState, mode);
            first = false;
          }
        } else if (mode === "resize-t") {
          newState = resizeTopLeft(
            prev,
            prev.x,
            y,
            onResize2 ? undefined : aspectRef.current
          );
          if (first) {
            onResize2?.(prev, newState, mode);
            first = false;
          }
        } else if (mode === "resize-r") {
          newState = resizeBottomRight(
            prev,
            x,
            prev.y + prev.height,
            onResize2 ? undefined : aspectRef.current
          );
          if (first) {
            onResize2?.(prev, newState, mode);
            first = false;
          }
        } else if (mode === "resize-b") {
          newState = resizeBottomRight(
            prev,
            prev.x + prev.width,
            y,
            onResize2 ? undefined : aspectRef.current
          );
          if (first) {
            onResize2?.(prev, newState, mode);
            first = false;
          }
        }
        return newState;
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [active]);

  const color = active ? "#3b82f6" : "#9ca3af";

  return (
    <div
      ref={containerRef}
      className="move"
      style={{
        position: "absolute",
        top: `${data.y}px`,
        left: `${data.x}px`,
        width: `${data.width}px`,
        height: `${data.height}px`,
        cursor: active ? "move" : "default",
        pointerEvents: active ? "auto" : "none",
      }}
    >
      <div style={{ pointerEvents: "none", width: "100%", height: "100%" }}>
        {children}
      </div>

      <div
        className="resize-tl"
        style={{
          width: "10px",
          height: "10px",
          position: "absolute",
          top: 0,
          left: 0,
          cursor: "nwse-resize",
          backgroundColor: color,
          transform: "translate(-50%, -50%)",
          borderRadius: "100%",
        }}
      ></div>
      <div
        className="resize-tr"
        style={{
          width: "10px",
          height: "10px",
          position: "absolute",
          top: 0,
          right: 0,
          cursor: "nesw-resize",
          backgroundColor: color,
          transform: "translate(50%, -50%)",
          borderRadius: "100%",
        }}
      ></div>
      <div
        className="resize-bl"
        style={{
          width: "10px",
          height: "10px",
          position: "absolute",
          bottom: 0,
          left: 0,
          cursor: "nesw-resize",
          backgroundColor: color,
          transform: "translate(-50%, 50%)",
          borderRadius: "100%",
        }}
      ></div>
      <div
        className="resize-br"
        style={{
          width: "10px",
          height: "10px",
          position: "absolute",
          bottom: 0,
          right: 0,
          cursor: "nwse-resize",
          backgroundColor: color,
          transform: "translate(50%, 50%)",
          borderRadius: "100%",
        }}
      ></div>

      <div
        className="resize-l"
        style={{
          width: "2px",
          height: "100%",
          position: "absolute",
          left: 0,
          top: 0,
          cursor: "ew-resize",
          backgroundColor: color,
        }}
      ></div>
      <div
        className="resize-t"
        style={{
          width: "100%",
          height: "2px",
          position: "absolute",
          left: 0,
          top: 0,
          cursor: "ns-resize",
          backgroundColor: color,
        }}
      ></div>
      <div
        className="resize-r"
        style={{
          width: "2px",
          height: "100%",
          position: "absolute",
          right: 0,
          top: 0,
          cursor: "ew-resize",
          backgroundColor: color,
        }}
      ></div>
      <div
        className="resize-b"
        style={{
          width: "100%",
          height: "2px",
          position: "absolute",
          left: 0,
          bottom: 0,
          cursor: "ns-resize",
          backgroundColor: color,
        }}
      ></div>
    </div>
  );
}
