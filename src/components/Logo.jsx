const Logo = () => {
  return (
    <div className="relative flex items-center w-fit mx-auto sm:mx-0">
      <div className="absolute inset-0 flex items-center justify-center">
        <img 
          src="/logo.png" 
          alt="BUXDAO Logo" 
          className="h-12 w-auto object-contain filter blur-[1px] opacity-85 transition-all duration-300 hover:opacity-100 hover:blur-0" 
        />
      </div>
      <div className="relative">
        <span 
          className="whitespace-nowrap text-3xl font-extrabold tracking-normal z-10"
          style={{
            fontFamily: "'Poppins', sans-serif",
            color: 'transparent',
            WebkitTextStroke: '1.5px #FFD600',
            textStroke: '1.5px #FFD600'
          }}
        >
          BUX&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;DAO
        </span>
      </div>
    </div>
  );
};

export default Logo; 