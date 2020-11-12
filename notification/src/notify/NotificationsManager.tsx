import React, { useEffect } from 'react';

import Notification, { NotificatonProps } from './notification';

interface Props {
  setNotify(fn: (params: NotificatonProps) => void): void;
}

export default function NotificationsManager(props: Props) {
  const { setNotify } = props;
  const [notifications, setNotifications] = React.useState([]);

  const createNotification = ({ color, autoClose, children }): void => {
    setNotifications(prevNotifications => [
      ...prevNotifications,
      {
        children,
        color,
        autoClose,
        id: prevNotifications.length,
      },
    ]);
  };

  useEffect(() => {
    setNotify(({ color, autoClose, children }) => createNotification({ color, autoClose, children }));
  }, [setNotify]);

  const deleteNotification = (id: number): void => {
    const filteredNotifications = notifications.filter((_, index) => id !== index, []);
    setNotifications(filteredNotifications);
  };

  return (
    <template>
      {notifications.map(({ id, ...props }, index) => (
        <Notification key={id} onDelete={(): void => deleteNotification(index)} {...props} />
      ))}
    </template>
  );
}
