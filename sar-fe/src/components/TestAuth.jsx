import AuthLayout from './AuthLayout';

const TestAuth = () => {
  return (
    <AuthLayout 
      title="Test Page" 
      subtitle="Testing the AuthLayout component"
    >
      <div className="text-center">
        <h2 className="text-xl font-bold text-white mb-4">AuthLayout Test</h2>
        <p className="text-blue-200 mb-4">
          If you can see this, the AuthLayout is working correctly!
        </p>
        <button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-2 px-4 rounded-xl transition-all duration-200">
          Test Button
        </button>
      </div>
    </AuthLayout>
  );
};

export default TestAuth;
