import React from 'react';
import { createPortal } from 'react-dom';

interface Props {
  stylesheet?: string;
}

const Style = ({ stylesheet }: Props) => {
  const isServer = typeof window === 'undefined';

  if (!stylesheet) {
    return null;
  }

  return isServer ? createPortal(<style>{stylesheet}</style>, document.head) : <style>{stylesheet}</style>;
};

export default Style;
