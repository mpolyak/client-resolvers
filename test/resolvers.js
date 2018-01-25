const assert = require("assert");
const {ApolloClient} = require("apollo-client");
const {InMemoryCache} = require("apollo-cache-inmemory");
const {HttpLink} = require("apollo-link-http");
const {withClientState} = require("apollo-link-state");
const gql = require("graphql-tag");

const {
    addResolvers,
    removeResolvers,
    clearResolvers,
    getProxyResolvers,
} = require("../src/resolvers.js");

describe("Resolvers", function() {
    beforeEach(function() {
        clearResolvers();
    });

    it("add and remove resolvers", function addAndRemoveResolvers() {
        assert.equal(getProxyResolvers()["Test"], undefined);

        const resolvers1 = addResolvers({
            Test: {
                foo: "foo",
            },
        });

        const resolvers2 = addResolvers({
            Test: {
                bar: "bar",
            },
        });

        // Add the same field resolvers as `resolvers1`.
        const resolvers3 = addResolvers({
            Test: {
                foo: "foo",
            },
        });

        assert.deepEqual(getProxyResolvers()["Test"], {
            foo: "foo",
            bar: "bar",
        });

        // Verify `resolvers3` will resolve `foo` field.
        removeResolvers(resolvers1);

        assert.deepEqual(getProxyResolvers()["Test"], {
            foo: "foo",
            bar: "bar",
        });

        removeResolvers(resolvers3);

        assert.deepEqual(getProxyResolvers()["Test"], {
            bar: "bar",
        });

        removeResolvers(resolvers2);

        assert.equal(getProxyResolvers()["Test"], undefined);
    });
});

describe("Apollo", function() {
    beforeEach(function() {
        clearResolvers();
    });

    it("query client state", function() {
        const local = withClientState({
            resolvers: getProxyResolvers(),
        });

        const client = new ApolloClient({
            link: local,
            cache: new InMemoryCache(),
        });

        // Add resolver to satisfy `user` query.
        addResolvers({
            Query: {
                user: () => {
                    return {
                        __typename: "User",
                        id: "test",
                    };
                },
            },
        });

        // Seperately add resolver for `User.name` field.
        addResolvers({
            User: {
                name: (obj) => {
                    assert.deepEqual(obj, {
                        __typename: "User",
                        id: "test",
                    });

                    return {
                        __typename: "Name",
                        first: "foo",
                        last: "bar",
                    };
                },
            },
        });

        const query = gql`
            query {
                user @client {
                    id
                    name {
                        first
                        last
                    }
                }
            }
        `;

        return client.query({query}).then(({data}) => {
            assert.deepEqual(data, {
                user: {
                    __typename: "User",
                    id: "test",
                    name: {
                        __typename: "Name",
                        first: "foo",
                        last: "bar",
                    },
                },
            });
        });
    });

    it("query server and client state", function() {
        const data = {
            user: {
                __typename: "User",
                id: "test",
            },
        };

        const http = new HttpLink({fetch: (uri, options) => {
            return Promise.resolve({
                status: "200",
                text: () => Promise.resolve(JSON.stringify({
                    data,
                })),
            });
        }});

        const local = withClientState({
            resolvers: getProxyResolvers(),
        });

        const client = new ApolloClient({
            link: local.concat(http),
            cache: new InMemoryCache(),
        });

        // Add resolver for `User.name` field, while `user` itself is resolved
        // by the GraphQL "server".
        addResolvers({
            User: {
                name: (obj) => {
                    assert.deepEqual(obj, {
                        __typename: "User",
                        id: "test",
                    });

                    return {
                        __typename: "Name",
                        first: "foo",
                        last: "bar",
                    };
                },
            },
        });

        const query = gql`
            query {
                user {
                    id
                    name @client {
                        first
                        last
                    }
                }
            }
        `;

        return client.query({query}).then(({data}) => {
            assert.deepEqual(data, {
                user: {
                    __typename: "User",
                    id: "test",
                    name: {
                        __typename: "Name",
                        first: "foo",
                        last: "bar",
                    },
                },
            });
        });
    });

    it("mutate client state", function() {
        const local = withClientState({
            resolvers: getProxyResolvers(),
        });

        const client = new ApolloClient({
            link: local,
            cache: new InMemoryCache(),
        });

        // Add resolver to satisfy `addUser` mutation.
        addResolvers({
            Mutation: {
                addUser: (_, {id, first, last}, {cache}) => {
                    const query = gql`
                        query {
                            users {
                                id
                                name {
                                    first
                                    last
                                }
                            }
                        }
                    `;

                    let users;

                    try {
                        const result = cache.readQuery({query});

                        users = result.users;
                    } catch(e) {
                        // Default state.
                        users = [];
                    }

                    users.push({
                        __typename: "User",
                        id,
                        name: {
                            __typename: "Name",
                            first,
                            last,
                        },
                    });

                    cache.writeQuery({
                        query,
                        data: {
                            users,
                        },
                    })

                    return users.length;
                },
            },
        });

        const mutation = gql`
            mutation addUser($id: ID!, $first: String!, $last: String!) {
                addUser(id: $id, first: $first, last: $last) @client
            }
        `;

        return client.mutate({
                mutation,
                variables: {
                    id: 1,
                    first: "foo",
                    last: "bar",
                },
            })
            .then(({data: {addUser}}) => {
                assert.equal(addUser, 1);

                return client.mutate({
                    mutation,
                    variables: {
                        id: 2,
                        first: "foo",
                        last: "bar",
                    },
                });
            })
            .then(({data: {addUser}}) => {
                assert.equal(addUser, 2);

                // Add resolver to satisfy `userById` query.
                addResolvers({
                    Query: {
                        userById: (_, {id}, {cache}) => {
                            const fragment = gql`
                                fragment user on User {
                                    id
                                    name {
                                        first
                                        last
                                    }
                                }
                            `;
                            
                            return cache.readFragment({
                                id: `User:${id}`,
                                fragment,
                            });
                        },
                    },
                });

                const query = gql`
                    query getUserById($id: ID!) {
                        userById(id: $id) @client {
                            id
                            name {
                                first
                                last
                            }
                        }
                    }
                `;

                return client.query({
                    query,
                    variables: {
                        id: 1,
                    },
                });
            })
            .then(({data: {userById}}) => {
                assert.deepEqual(userById, {
                    __typename: "User",
                    id: 1,
                    name: {
                        __typename: "Name",
                        first: "foo",
                        last: "bar",
                    },
                });

                // Apollo is able to query for `users` without a resolver since
                // it's a cached root query; `@client` directive is not needed.
                const query = gql`
                    query {
                        users {
                            id
                            name {
                                first
                                last
                            }
                        }
                    }
                `;

                return client.query({query});
            })
            .then(({data: {users}}) => {
                assert.deepEqual(users, [
                    {
                        __typename: "User",
                        id: 1,
                        name: {
                            __typename: "Name",
                            first: "foo",
                            last: "bar",
                        },
                    },
                    {
                        __typename: "User",
                        id: 2,
                        name: {
                            __typename: "Name",
                            first: "foo",
                            last: "bar",
                        },
                    },
                ]);
            });
    });
});
