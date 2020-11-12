import React, { useEffect, useState, ReactNode } from 'react';
import styles from './index.module.scss';
import cn from 'classnames';
import { ReactComponent as Times } from './times.svg';
import createContainer from '../createContainer/index';
import { createPortal } from 'react-dom';

export enum Color {
  info = 'info',
  success = 'success',
  warning = 'warning',
  error = 'error',
}

export interface NotificatonProps {
  color?: Color;
  autoClose?: boolean;
  onDelete(): void;
  children: ReactNode;
}

const container = createContainer();

const timeToDelete = 300;
const timeToClose = 1000 * 10;

const Notification: React.FC<NotificatonProps> = ({ color = Color.info, autoClose = false, children, onDelete }) => {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (autoClose) {
      const timerId = setTimeout(() => setIsClosing(true), timeToClose);
      return (): void => {
        clearTimeout(timerId);
      };
    }
  }, [autoClose]);
  useEffect(() => {
    if (isClosing) {
      const timerId = setTimeout(() => setIsClosing(true), timeToDelete);
      return (): void => {
        clearTimeout(timerId);
      };
    }
  }, [isClosing, onDelete]);
  return createPortal(
    <div
      className={cn([
        styles.container,
        {
          [styles.shrink]: isClosing,
        },
      ])}
    >
      <div
        className={cn([
          styles.notification,
          styles[color],
          {
            [styles.slideIn]: !isClosing,
            [styles.slideOut]: isClosing,
          },
        ])}
      >
        {children}
        <button type="button" onClick={(): void => setIsClosing(true)} className={styles.closeButton}>
          <Times height={16} />
        </button>
      </div>
    </div>,
    container
  );
};

export default Notification;
