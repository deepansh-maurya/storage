const Footer = () => {
  return (
    <footer className="mt-8">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between text-sm text-muted">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold">
            ND
          </div>
          <div>
            <div className="font-semibold text-foreground">NimbusDrive</div>
            <div className="text-xs text-muted">Secure cloud storage</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <a href="#" className="hover:underline">
            Docs
          </a>
          <a href="#" className="hover:underline">
            Privacy
          </a>
          <a href="#" className="hover:underline">
            Terms
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
