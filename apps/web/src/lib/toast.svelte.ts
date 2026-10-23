export type ToastKind = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

let counter = 0;
let items = $state<ToastItem[]>([]);

export const toasts = {
  get items() {
    return items;
  },
  show(message: string, kind: ToastKind = 'info') {
    const id = ++counter;
    items = [...items, { id, message, kind }];
    setTimeout(() => {
      items = items.filter((item) => item.id !== id);
    }, 4200);
  },
  success(message: string) {
    this.show(message, 'success');
  },
  error(message: string) {
    this.show(message, 'error');
  },
  dismiss(id: number) {
    items = items.filter((item) => item.id !== id);
  },
};
