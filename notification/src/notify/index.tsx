import React from 'react';
import ReactDOM from 'react-dom';

import NotificationsManager from './NotificationsManager';
import Notification, { Color } from './notification';
import createContainer from './createContainer';

const containerElement = createContainer();

let notify;

ReactDOM.render(
  <NotificationsManager
    setNotify={(notifyFn): void => {
      notify = notifyFn;
    }}
  />,
  containerElement
);

export { Notification, Color };

export function info(children, autoClose): () => void {
  return notify({
    color: Color.info,
    children,
    autoClose,
  });
}
