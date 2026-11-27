import type { ComponentProps } from 'react';

/**
 * `<form>` con `method="post"` y sin validación nativa (la hace el formulario). El `method` no es decoración: un envío ANTES de que React
 * hidrate (Enter o clic con la página aún cargando) es un envío nativo, y por defecto sería un GET con los campos en la dirección: la
 * contraseña acabaría en la barra, el historial y los registros. Con POST no viaja en la URL; con JS el `onSubmit` lo intercepta.
 */
export function Form(props: Omit<ComponentProps<'form'>, 'method' | 'noValidate'>) {
  return <form method="post" noValidate {...props} />;
}
