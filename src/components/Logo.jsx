const Logo = () => {
  return (
    <div className="relative flex items-center">
      <img 
        src="/logo.png" 
        alt="BUXDAO Logo" 
        className="h-12 w-auto object-contain filter blur-[1px] opacity-85 transition-all duration-300 hover:opacity-100 hover:blur-0" 
      />
      <span 
        className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-poppins text-3xl font-bold tracking-normal"
        style={{
          color: 'transparent',
          WebkitTextStroke: '1.5px #FFD700',
          textStroke: '1.5px #FFD700'
        }}
      >
        BUX&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;DAO
      </span>
    </div>
  );
};

export default Logo; 