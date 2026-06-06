type CubicBezier = [number, number, number, number];
const ease: CubicBezier = [0.76, 0, 0.24, 1];

export const slideRight = {
  initial: { x: "100%" },
  animate: {
    x: "0%",
    transition: { duration: 0.6, ease },
  },
  exit: {
    x: "100%",
    transition: { duration: 1, ease },
  },
};

export const slideUpModal = {
  initial: { y: "100%", opacity: 0 },
  enter: {
    y: "0%",
    opacity: 1,
    transition: { duration: 0.5, ease },
  },
  exit: {
    y: "100%",
    opacity: 0,
    transition: { duration: 0.4, ease },
  },
};

export const slide = {
  initial: { opacity: 0, y: "100vh" },
  animate: {
    opacity: 1,
    y: "0",
    transition: { duration: 1, ease },
  },
  exit: {
    opacity: 0,
    y: "100vh",
    transition: { duration: 0.8, ease },
  },
};

export const slideSidebarLeft = {
  initial: { x: "100%" },
  animate: {
    x: "0%",
    transition: { duration: 0.6, ease },
  },
  exit: {
    x: "100%",
    transition: { duration: 0.8, ease },
  },
};