import React from 'react';

export function FacebookReviews() {
  return (
    <section className="sec bg-white border-t border-gray-100" id="reviews">
      <div className="container max-w-2xl mx-auto px-4">
        <div className="text-center mb-10">
          <div
            className="eyebrow"
            style={{justifyContent: 'center', marginBottom: '10px'}}
          >
            CLIENTES FELICES
          </div>
          <h2 className="h2 text-center" style={{marginBottom: '2rem'}}>
            Familias en toda Colombia
            <br />
            ya confían en CleanBrush 🇨🇴
          </h2>
        </div>

        <div className="space-y-8">
          {/* Review 1 */}
          <FacebookReviewCard
            name="Carolina Martínez"
            date="2 h"
            avatar="C"
            avatarColor="#1877F2"
            text="¡Me acaba de llegar y WOW! La calidad superó mis expectativas. ¡Totalmente vale la pena! 🎉"
            image="/images/review-cleanbrush-1.jpg"
            likes={47}
            replies={[
              {
                name: 'Tecnik Soporte',
                text: '¡Nos alegra mucho que te guste Carolina! Gracias por confiar en nosotros.',
                date: '1 h',
                avatar: 'T',
                avatarColor: '#000',
                likes: 8,
              },
            ]}
          />

          {/* Review 2 */}
          <FacebookReviewCard
            name="Roberto Ángel"
            date="5 h"
            avatar="R"
            avatarColor="#6D28D9"
            text="Llegó súper rápido a Barranquilla. Lo instalé en 2 minutos. Muy recomendado."
            image="/images/review-cleanbrush-2.jpg"
            likes={124}
          />

          {/* Review 3 */}
          <FacebookReviewCard
            name="Valentina Torres"
            date="1 d"
            avatar="V"
            avatarColor="#10B981"
            text="Pedí el kit de 2 unidades. Excelente para organizar los cepillos de toda la familia."
            image="/images/review-cleanbrush-3.jpg"
            likes={89}
            replies={[
              {
                name: 'Maria C.',
                text: '¿Cuánto tardó el envío?',
                date: '5 h',
                avatar: 'M',
                avatarColor: '#F59E0B',
                likes: 2,
              },
              {
                name: 'Valentina Torres',
                text: 'Solo 3 días! Súper rápido 🚀',
                date: '1 h',
                avatar: 'V',
                avatarColor: '#10B981',
                likes: 5,
              },
            ]}
          />
        </div>
      </div>
    </section>
  );
}

function FacebookReviewCard({
  name,
  date,
  avatar,
  avatarColor,
  text,
  image,
  likes,
  replies = [],
}: any) {
  return (
    <div className="flex gap-3 font-sans text-[15px] animate-fade-in">
      <div className="flex-shrink-0">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg select-none"
          style={{backgroundColor: avatarColor}}
        >
          {avatar}
        </div>
      </div>
      <div className="flex-grow">
        <div className="bg-[#F0F2F5] rounded-2xl px-4 py-3 inline-block">
          <div className="font-bold text-[#050505] text-[13px] leading-4 mb-1">
            {name}
          </div>
          <div className="text-[#050505] leading-snug">{text}</div>
        </div>

        {image && (
          <div className="mt-3 max-w-[400px] rounded-xl overflow-hidden border border-gray-200 shadow-sm cursor-pointer hover:opacity-95 transition-opacity">
            <img src={image} alt="Review" className="w-full h-auto block" />
          </div>
        )}

        <div className="flex items-center gap-4 mt-1 ml-1 text-[12px] font-bold text-[#65676B]">
          <span className="cursor-pointer hover:underline">Me gusta</span>
          <span className="cursor-pointer hover:underline">Responder</span>
          <span className="font-normal text-[#65676B]">{date}</span>

          {likes > 0 && (
            <div className="flex items-center gap-1 ml-auto shadow-sm bg-white rounded-full px-1 py-0.5 border border-gray-100">
              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                </svg>
              </div>
              <span className="text-[#65676B] font-normal">{likes}</span>
            </div>
          )}
        </div>

        {/* Replies */}
        {replies.length > 0 && (
          <div className="mt-2 space-y-2">
            {replies.map((reply: any, i: number) => (
              <div key={i} className="flex gap-2 relative">
                {/* Connection line */}
                <div className="absolute -left-6 top-0 bottom-6 w-5 border-l-2 border-b-2 border-gray-200 rounded-bl-xl opacity-50"></div>

                <div className="flex-shrink-0 relative z-10">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm select-none"
                    style={{backgroundColor: reply.avatarColor}}
                  >
                    {reply.avatar}
                  </div>
                </div>
                <div>
                  <div className="bg-[#F0F2F5] rounded-2xl px-3 py-2 inline-block">
                    <div className="font-bold text-[#050505] text-[12px] leading-4 mb-0.5">
                      {reply.name}
                    </div>
                    <div className="text-[#050505] text-[13px] leading-snug">
                      {reply.text}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 ml-1 text-[11px] font-bold text-[#65676B]">
                    <span className="cursor-pointer hover:underline">
                      Me gusta
                    </span>
                    <span className="cursor-pointer hover:underline">
                      Responder
                    </span>
                    <span className="font-normal">{reply.date}</span>
                    {reply.likes > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="w-3.5 h-3.5 bg-blue-500 rounded-full flex items-center justify-center">
                          <svg
                            width="8"
                            height="8"
                            viewBox="0 0 24 24"
                            fill="white"
                          >
                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                          </svg>
                        </div>
                        <span className="text-[#65676B] font-normal">
                          {reply.likes}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
