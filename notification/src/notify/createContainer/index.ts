import styles from './index.module.scss'


export default function createContainer(): Element {
  const portaId = "notifyContainer";

  let element = document.querySelector(`#${portaId}`)

  if (element) {
    return element;
  }

  element = document.createElement('div');
  element.setAttribute('id', portaId);
  element.className = styles.container;
  document.body.appendChild(element);
  return element;
}
