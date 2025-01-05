          <div className="flex flex-col md:flex-row gap-8">
            {/* Image section */}
            <div className="flex-1 relative">
              <img
                src={showFront ? product.images.front : product.images.back}
                alt={product.name}
                className="w-full rounded-lg"
              />
              {product.images.back && (
                <button
                  onClick={() => setShowFront(!showFront)}
                  className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm hover:bg-black/70 transition-colors"
                >
                  Show {showFront ? 'Back' : 'Front'}
                </button>
              )}
            </div>
          </div> 