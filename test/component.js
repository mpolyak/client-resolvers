const assert = require("assert");
const {ApolloClient} = require("apollo-client");
const {InMemoryCache} = require("apollo-cache-inmemory");
const {withClientState} = require("apollo-link-state");
const {graphql} = require("react-apollo");
const gql = require("graphql-tag");
const React = require("react");
const PropTypes = require("prop-types");
const TestRenderer = require("react-test-renderer");

const {clientResolvers} = require("../src/component.js");
const {
    clearResolvers,
    getProxyResolvers,
} = require("../src/resolvers.js");

const renderWithApollo = (WrappedComponent) => {
    const state = withClientState({
        // Dynamically resolve client fields for mounted components.
        resolvers: getProxyResolvers(),
    });

    const client = new ApolloClient({
      link: state,
      cache: new InMemoryCache(),
    });

    class ApolloWrapper extends React.Component {
        getChildContext() {
            return {
                client: this.props.client,
            };
        }

        render() {
            return React.createElement(WrappedComponent, {});
        }
    }

    ApolloWrapper.childContextTypes = {
        client: PropTypes.object.isRequired,
    };

    return TestRenderer.create(
        React.createElement(ApolloWrapper, {client}));
};

describe("Component", function() {
    beforeEach(function() {
        clearResolvers();
    });

    it("wraps component with resolvers", function() {
        const Component = (props) => null;

        const ComponentWithResolvers = clientResolvers({
            Test: {
                foo: "foo",
                bar: "bar",
            },
        })(Component);

        const testRenderer = TestRenderer.create(
            React.createElement(ComponentWithResolvers, {}));

        assert.deepEqual(getProxyResolvers()["Test"], {
            foo: "foo",
            bar: "bar",
        });

        testRenderer.unmount();

        assert.deepEqual(getProxyResolvers()["Test"], undefined);
    });

    it("query with component resolvers", function(done) {
        const resolvers = {
            Query: {
                test: () => {
                    return {
                        __typename: "Test",
                        foo: "bar",
                    };
                },
            },
        };

        class Component extends React.Component {
            render() {
                if (this.props.data.test) {
                    const {foo} = this.props.data.test;

                    assert.equal(foo, "bar");

                    done();
                }

                return null;
            }
        }

        const ComponentWithResolvers = clientResolvers(resolvers)(Component);

        const query = gql`
            query {
                test @client {
                    foo
                }
            }
        `;

        const ComponentWithGraphQL = graphql(query)(ComponentWithResolvers);

        renderWithApollo(ComponentWithGraphQL);
    });

    it("mutate with component resolvers", function(done) {
        const resolvers = {
            Mutation: {
                test: () => {
                    return {
                        __typename: "Test",
                        foo: "bar",
                    };
                },
            },
        };

        class Component extends React.Component {
            componentDidMount() {
                this.props.mutate().then(({data}) => {
                    const {foo} = data.test;

                    assert.equal(foo, "bar");

                    done();
                });
            }

            render() {
                return null;
            }
        }

        const ComponentWithResolvers = clientResolvers(resolvers)(Component);

        const mutation = gql`
            mutation {
                test @client {
                    foo
                }
            }
        `;

        const ComponentWithGraphQL = graphql(mutation)(ComponentWithResolvers);

        renderWithApollo(ComponentWithGraphQL);
    });
});
