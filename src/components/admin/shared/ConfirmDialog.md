# ConfirmDialog.tsx

- **Que hace**: Dialog modal de confirmacion con animacion Framer Motion, variantes danger y default
- **Datos**: Props open, title, description, confirmLabel, confirmVariant, onConfirm, onCancel
- **Dependencias**: Framer Motion (AnimatePresence), Phosphor Warning, cn
- **Pitfalls**: AnimatePresence requiere que el componente este en el arbol al desmontar; variantes: danger (rojo) y default (borgona)
