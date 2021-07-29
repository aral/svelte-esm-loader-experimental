export default async request => {

  //////////////////////////////////////////////////////////////////
  //
  // Note: you can perform any asynchronous actions here.
  // ===== Just export the result as as a property called data
  //       and that will be available to you on the client.
  //
  // Injected properties that you have available:
  //
  // - request: the Node request object.
  //
  //////////////////////////////////////////////////////////////////

  return {
    location: 'from the server',
    message: ['this', 'could', 'be', 'from', 'a', 'database', request.mock]
  }

}