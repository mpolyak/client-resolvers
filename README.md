# Support for dynamic client-only GraphQL resolvers with Apollo Client

When creating an [Apollo Client](https://github.com/apollographql/apollo-client) with [`withClientState`](https://github.com/apollographql/apollo-link-state) state link, it is expected for the resolver map to be provided at creation time. This limitation precludes dynamically imported components from utilizing client-only GraphQL object types and fields.

`client-resolvers` enables [apollo-link-state](https://github.com/apollographql/apollo-link-state) client-only resolves to be added dynamically at runtime for components as they are mounted and unmounted in the React render tree.

# Example

```
// index.js
import {getProxyResolvers} from "./src/index.js";

const stateLink = withClientState({
    // Dynamically resolve client fields for mounted components.
    resolvers: getProxyResolvers(),
});

const client = new ApolloClient({
  link: stateLink,
  cache: new InMemoryCache(),
});

ReactDOM.render(
    <ApolloProvider client={client}>
        <App />
    </ApolloProvider>,
    document.getElementById('app'));
```

```
// App.js
import {clientResolvers} from "./src/index.js";

const QUERY = gql`
    query {
        app @client {
            name
        }
    }
`;

const RESOLVERS = {
    Query: {
        app: () => {
            return {
                __typename: "App",
                name: "Test App",
            }
        },
    },
};

class App extends React.Component {
    render() {
        const {data} = this.props;

        if (data.app) {
            return <div>{data.app.name}</div>; // "Test App"
        }

        return null;
    }
}

const AppWithResolvers = clientResolvers(RESOLVERS)(App);

export default graphql(QUERY)(AppWithResolvers);
```