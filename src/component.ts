import { motion } from "framer-motion";
import { forwardRef, memo, type ForwardRefRenderFunction } from "react";

export function stdMotion<T, P = {}>(render: ForwardRefRenderFunction<T, P>) {
  return motion(forwardRef(render));
}

export function memoMotion<T, P = {}>(render: ForwardRefRenderFunction<T, P>) {
  return memo(stdMotion(render));
}

export function memoForward<T, P = {}>(render: ForwardRefRenderFunction<T, P>) {
  return memo(forwardRef(render));
}
