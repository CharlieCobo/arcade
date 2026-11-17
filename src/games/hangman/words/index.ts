import type { Language } from '@core/i18n/languages'

export type Category = 'animals' | 'food' | 'countries' | 'objects'
export const CATEGORIES: Category[] = ['animals', 'food', 'countries', 'objects']

type WordList = Record<Category, string[]>

/** Palabras por idioma y categoría. Se muestran tal cual (con tildes); se adivinan sin ellas. */
export const WORDS: Record<Language, WordList> = {
  es: {
    animals: [
      'ELEFANTE', 'JIRAFA', 'TIBURÓN', 'MARIPOSA', 'COCODRILO', 'PINGÜINO', 'CANGURO', 'MURCIÉLAGO',
      'DELFÍN', 'ARDILLA', 'CAMALEÓN', 'HIPOPÓTAMO', 'RINOCERONTE', 'ÁGUILA', 'TORTUGA', 'CABALLO',
      'CONEJO', 'LEÓN', 'TIGRE', 'PULPO', 'BALLENA', 'HORMIGA', 'LOBO', 'ZORRO', 'OSO PANDA',
    ],
    food: [
      'MANZANA', 'PLÁTANO', 'NARANJA', 'FRESA', 'SANDÍA', 'MELOCOTÓN', 'PIÑA', 'CEREZA', 'AGUACATE',
      'ARÁNDANO', 'GUAYABA', 'MANGO', 'PAELLA', 'TORTILLA', 'CROQUETA', 'EMPANADA', 'CHOCOLATE',
      'GALLETA', 'ESPAGUETIS', 'HAMBURGUESA', 'AREPA', 'GAZPACHO', 'CHURROS', 'QUESO', 'YOGUR',
    ],
    countries: [
      'ESPAÑA', 'COLOMBIA', 'MÉXICO', 'ARGENTINA', 'PORTUGAL', 'BRASIL', 'JAPÓN', 'CANADÁ', 'NORUEGA',
      'SUECIA', 'ITALIA', 'FRANCIA', 'ALEMANIA', 'MARRUECOS', 'AUSTRALIA', 'EGIPTO', 'PERÚ', 'CHILE',
      'COSTA RICA', 'NUEVA ZELANDA', 'ISLANDIA', 'TAILANDIA', 'VENEZUELA', 'URUGUAY', 'IRLANDA',
    ],
    objects: [
      'PARAGUAS', 'BICICLETA', 'GUITARRA', 'TELÉFONO', 'LÁMPARA', 'ESPEJO', 'MOCHILA', 'CUCHARA',
      'TIJERAS', 'RELOJ', 'ORDENADOR', 'TECLADO', 'AURICULARES', 'CÁMARA', 'PELOTA', 'ALMOHADA',
      'CEPILLO', 'LLAVE', 'VENTANA', 'ESCALERA', 'BOLÍGRAFO', 'CUADERNO', 'TELESCOPIO', 'ZAPATILLA', 'MALETA',
    ],
  },
  en: {
    animals: [
      'ELEPHANT', 'GIRAFFE', 'SHARK', 'BUTTERFLY', 'CROCODILE', 'PENGUIN', 'KANGAROO', 'BAT', 'DOLPHIN',
      'SQUIRREL', 'CHAMELEON', 'HIPPOPOTAMUS', 'RHINOCEROS', 'EAGLE', 'TURTLE', 'HORSE', 'RABBIT', 'LION',
      'TIGER', 'OCTOPUS', 'WHALE', 'ANT', 'WOLF', 'FOX', 'PANDA BEAR',
    ],
    food: [
      'APPLE', 'BANANA', 'ORANGE', 'STRAWBERRY', 'WATERMELON', 'PEACH', 'PINEAPPLE', 'CHERRY', 'AVOCADO',
      'BLUEBERRY', 'MANGO', 'COCONUT', 'PIZZA', 'PANCAKE', 'SANDWICH', 'CHOCOLATE', 'COOKIE', 'SPAGHETTI',
      'HAMBURGER', 'POPCORN', 'BURRITO', 'OMELETTE', 'CHEESE', 'YOGURT', 'MUFFIN',
    ],
    countries: [
      'SPAIN', 'COLOMBIA', 'MEXICO', 'ARGENTINA', 'PORTUGAL', 'BRAZIL', 'JAPAN', 'CANADA', 'NORWAY',
      'SWEDEN', 'ITALY', 'FRANCE', 'GERMANY', 'MOROCCO', 'AUSTRALIA', 'EGYPT', 'PERU', 'CHILE',
      'COSTA RICA', 'NEW ZEALAND', 'ICELAND', 'THAILAND', 'VENEZUELA', 'URUGUAY', 'IRELAND',
    ],
    objects: [
      'UMBRELLA', 'BICYCLE', 'GUITAR', 'TELEPHONE', 'LAMP', 'MIRROR', 'BACKPACK', 'SPOON', 'SCISSORS',
      'CLOCK', 'COMPUTER', 'KEYBOARD', 'HEADPHONES', 'CAMERA', 'BALL', 'PILLOW', 'TOOTHBRUSH', 'KEY',
      'WINDOW', 'LADDER', 'PENCIL', 'NOTEBOOK', 'TELESCOPE', 'SNEAKER', 'SUITCASE',
    ],
  },
  pt: {
    animals: [
      'ELEFANTE', 'GIRAFA', 'TUBARÃO', 'BORBOLETA', 'CROCODILO', 'PINGUIM', 'CANGURU', 'MORCEGO',
      'GOLFINHO', 'ESQUILO', 'CAMALEÃO', 'HIPOPÓTAMO', 'RINOCERONTE', 'ÁGUIA', 'TARTARUGA', 'CAVALO',
      'COELHO', 'LEÃO', 'TIGRE', 'POLVO', 'BALEIA', 'FORMIGA', 'LOBO', 'RAPOSA', 'ONÇA',
    ],
    food: [
      'MAÇÃ', 'BANANA', 'LARANJA', 'MORANGO', 'MELANCIA', 'PÊSSEGO', 'ABACAXI', 'CEREJA', 'ABACATE',
      'MIRTILO', 'GOIABA', 'MANGA', 'FEIJOADA', 'BRIGADEIRO', 'COXINHA', 'PASTEL', 'CHOCOLATE',
      'BISCOITO', 'ESPAGUETE', 'HAMBÚRGUER', 'PIPOCA', 'AÇAÍ', 'QUEIJO', 'IOGURTE', 'PÃO DE QUEIJO',
    ],
    countries: [
      'ESPANHA', 'COLÔMBIA', 'MÉXICO', 'ARGENTINA', 'PORTUGAL', 'BRASIL', 'JAPÃO', 'CANADÁ', 'NORUEGA',
      'SUÉCIA', 'ITÁLIA', 'FRANÇA', 'ALEMANHA', 'MARROCOS', 'AUSTRÁLIA', 'EGITO', 'PERU', 'CHILE',
      'COSTA RICA', 'NOVA ZELÂNDIA', 'ISLÂNDIA', 'TAILÂNDIA', 'VENEZUELA', 'URUGUAI', 'IRLANDA',
    ],
    objects: [
      'GUARDA-CHUVA', 'BICICLETA', 'VIOLÃO', 'TELEFONE', 'LUMINÁRIA', 'ESPELHO', 'MOCHILA', 'COLHER',
      'TESOURA', 'RELÓGIO', 'COMPUTADOR', 'TECLADO', 'FONES DE OUVIDO', 'CÂMERA', 'BOLA', 'TRAVESSEIRO',
      'ESCOVA', 'CHAVE', 'JANELA', 'ESCADA', 'LÁPIS', 'CADERNO', 'TELESCÓPIO', 'TÊNIS', 'MALA',
    ],
  },
}

/** Filas del teclado en pantalla por idioma. */
export const KEYBOARDS: Record<Language, string[]> = {
  es: ['QWERTYUIOP', 'ASDFGHJKLÑ', 'ZXCVBNM'],
  en: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'],
  pt: ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'],
}
