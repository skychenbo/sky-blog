import React, { useState } from 'react';
import { Notification, Color } from './notify';
import './App.css';

interface NoteInterface {
  id: number;
  color?: Color;
}

function App() {
  const [notifications, setNotifications] = useState<NoteInterface[]>([]);
  const createNotification = (color: Color): void => {
    setNotifications([
      ...notifications,
      {
        color,
        id: notifications.length,
      },
    ]);
  };

  const deleteNotification = (id: number): void =>
    setNotifications(notifications.filter(notification => notification.id !== id));

  return (
    <div className="App">
      <h1>Notification Demo</h1>
      <button type="button" onClick={(): void => createNotification(Color.info)}>
        Info
      </button>
      <button type="button" onClick={(): void => createNotification(Color.success)}>
        Success
      </button>
      <button type="button" onClick={(): void => createNotification(Color.warning)}>
        Warning
      </button>
      <button type="button" onClick={(): void => createNotification(Color.error)}>
        Error
      </button>
      {notifications.map(({ id, color }) => (
        <Notification autoClose={true} onDelete={(): void => deleteNotification(id)} key={id} color={color}>
          This is Notification
        </Notification>
      ))}
    </div>
  );
}

export default App;
