import React from 'react';
import { createPortal } from 'react-dom';

interface Props {
  stylesheet?: string;
}

const Style = ({ stylesheet }: Props) => {
  const hasDom = typeof document !== 'undefined';

  if (!stylesheet) {
    return null;
  }

  return hasDom ? createPortal(<style>{stylesheet}</style>, document.head) : <style>{stylesheet}</style>;
};

export default Style;
