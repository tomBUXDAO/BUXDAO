const Logo = () => {
  return (
    <div className="relative flex items-center">
      <img 
        src="/logo.png" 
        alt="BUXDAO Logo" 
        className="h-10 w-auto object-contain filter blur-[1px] opacity-85 transition-all duration-300 hover:opacity-100 hover:blur-0" 
      />
      <span 
        className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-poppins text-lg sm:text-xl font-bold tracking-normal"
        style={{
          color: 'transparent',
          WebkitTextStroke: '1px #FFD700',
          textStroke: '1px #FFD700'
        }}
      >
        BUX&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;DAO
      </span>
    </div>
  );
};

export default Logo; 