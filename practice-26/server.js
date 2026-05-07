import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

const typeDefs = `#graphql
  type Author {
    id: ID!
    name: String!
    bio: String
    birthYear: Int
    books: [Book!]!
  }

  type Book {
    id: ID!
    title: String!
    genre: String
    publishedYear: Int
    author: Author!
  }

  input CreateAuthorInput {
    name: String!
    bio: String
    birthYear: Int
  }

  input CreateBookInput {
    title: String!
    genre: String
    publishedYear: Int
    authorId: ID!
  }

  type Query {
    books: [Book!]!
    
    book(id: ID!): Book
    
    authors: [Author!]!
    
    author(id: ID!): Author

    booksByGenre(genre: String!): [Book!]!
  }

  type Mutation {
    createAuthor(input: CreateAuthorInput!): Author!
    
    createBook(input: CreateBookInput!): Book!
    
    updateAuthor(id: ID!, name: String, bio: String, birthYear: Int): Author!

    deleteBook(id: ID!): Boolean!
  }
`;

let authors = [
    {
        id: '1',
        name: 'Лев Толстой',
        bio: 'Великий русский писатель и мыслитель',
        birthYear: 1828
    },
    {
        id: '2',
        name: 'Фёдор Достоевский',
        bio: 'Русский писатель, мыслитель, философ и публицист',
        birthYear: 1821
    },
    {
        id: '3',
        name: 'Джордж Оруэлл',
        bio: 'Британский писатель и публицист',
        birthYear: 1903
    }
];

let books = [
    {
        id: '1',
        title: 'Война и мир',
        genre: 'Роман-эпопея',
        publishedYear: 1869,
        authorId: '1'
    },
    {
        id: '2',
        title: 'Анна Каренина',
        genre: 'Роман',
        publishedYear: 1877,
        authorId: '1'
    },
    {
        id: '3',
        title: 'Преступление и наказание',
        genre: 'Роман',
        publishedYear: 1866,
        authorId: '2'
    },
    {
        id: '4',
        title: 'Идиот',
        genre: 'Роман',
        publishedYear: 1869,
        authorId: '2'
    },
    {
        id: '5',
        title: '1984',
        genre: 'Антиутопия',
        publishedYear: 1949,
        authorId: '3'
    }
];

let nextAuthorId = 4;
let nextBookId = 6;

const resolvers = {
    Author: {
        books: (parent) => {
            return books.filter(book => book.authorId === parent.id);
        }
    },

    Book: {
        author: (parent) => {
            return authors.find(author => author.id === parent.authorId);
        }
    },

    Query: {
        books: () => {
            return books;
        },

        book: (_, { id }) => {
            return books.find(book => book.id === id);
        },

        authors: () => {
            return authors;
        },

        author: (_, { id }) => {
            return authors.find(author => author.id === id);
        },

        booksByGenre: (_, { genre }) => {
            return books.filter(book => book.genre === genre);
        }
    },

    Mutation: {
        createAuthor: (_, { input }) => {
            const newAuthor = {
                id: String(nextAuthorId++),
                name: input.name,
                bio: input.bio || null,
                birthYear: input.birthYear || null
            };
            authors.push(newAuthor);
            return newAuthor;
        },

        createBook: (_, { input }) => {
            const authorExists = authors.some(author => author.id === input.authorId);
            if (!authorExists) {
                throw new Error(`Автор с id ${input.authorId} не найден`);
            }

            const newBook = {
                id: String(nextBookId++),
                title: input.title,
                genre: input.genre || null,
                publishedYear: input.publishedYear || null,
                authorId: input.authorId
            };
            books.push(newBook);
            return newBook;
        },

        updateAuthor: (_, { id, name, bio, birthYear }) => {
            const authorIndex = authors.findIndex(author => author.id === id);
            if (authorIndex === -1) {
                throw new Error(`Автор с id ${id} не найден`);
            }

            const author = authors[authorIndex];
            if (name !== undefined) author.name = name;
            if (bio !== undefined) author.bio = bio;
            if (birthYear !== undefined) author.birthYear = birthYear;

            authors[authorIndex] = author;
            return author;
        },

        deleteBook: (_, { id }) => {
            const bookIndex = books.findIndex(book => book.id === id);
            if (bookIndex === -1) {
                return false;
            }
            books.splice(bookIndex, 1);
            return true;
        }
    }
};

const server = new ApolloServer({
    typeDefs,
    resolvers,
});

const startServer = async () => {
    const { url } = await startStandaloneServer(server, {
        listen: { port: 4000 },
        context: async ({ req }) => {
            const token = req.headers.authorization || '';
            return { token };
        },
    });

    console.log(`GraphQL сервер запущен на ${url}`);
    console.log(`Apollo Sandbox доступен по адресу: ${url}`);
    console.log('\nДоступные запросы:');
    console.log('- QUERY: books, book(id), authors, author(id), booksByGenre(genre)');
    console.log('- MUTATION: createAuthor, createBook, updateAuthor, deleteBook');
};

startServer();