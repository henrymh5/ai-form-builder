export default function PublicFormNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 text-center">
      <h1 className="text-text-primary text-xl font-semibold">Formular nicht gefunden</h1>
      <p className="text-text-secondary text-sm">
        Dieses Formular existiert nicht oder ist nicht mehr verfügbar.
      </p>
    </div>
  );
}
