// __tests__/Register.test.jsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Register from "../src/pages/Register";
import axios from "axios";
import { MemoryRouter } from "react-router-dom";

// Mock axios and useNavigate
jest.mock("axios");
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

describe("Register Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders form when not authenticated", async () => {
    axios.get.mockResolvedValue({ data: {} }); // user not logged in

    render(<Register />, { wrapper: MemoryRouter });

    // Wait for form inputs to appear
    expect(await screen.findByPlaceholderText("User Name")).toBeInTheDocument();
    expect(await screen.findByPlaceholderText("Email")).toBeInTheDocument();
    expect(await screen.findByPlaceholderText("Password")).toBeInTheDocument();
    expect(await screen.findByPlaceholderText("Repeat Password")).toBeInTheDocument();
  });

  test("submits form and navigates on successful registration", async () => {
    axios.get.mockResolvedValue({ data: {} }); // not authenticated
    axios.post.mockResolvedValue({ data: { success: true } });

    render(<Register />, { wrapper: MemoryRouter });

    const usernameInput = await screen.findByPlaceholderText("User Name");
    const emailInput = await screen.findByPlaceholderText("Email");
    const passwordInput = await screen.findByPlaceholderText("Password");
    const repeatPasswordInput = await screen.findByPlaceholderText("Repeat Password");

    fireEvent.change(usernameInput, { target: { value: "testuser" } });
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(repeatPasswordInput, { target: { value: "password123" } });

    fireEvent.click(screen.getByText("Submit"));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/register"),
        {
          username: "testuser",
          password: "password123",
          repeatedPassword: "password123",
          email: "test@example.com",
        },
        { withCredentials: true }
      );
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  test("shows alert if passwords do not match", async () => {
    axios.get.mockResolvedValue({ data: {} }); // not authenticated
    const alertMock = jest.spyOn(window, "alert").mockImplementation(() => {});

    render(<Register />, { wrapper: MemoryRouter });

    const usernameInput = await screen.findByPlaceholderText("User Name");
    const emailInput = await screen.findByPlaceholderText("Email");
    const passwordInput = await screen.findByPlaceholderText("Password");
    const repeatPasswordInput = await screen.findByPlaceholderText("Repeat Password");
    const submitButton = screen.getByText("Submit");

    fireEvent.change(usernameInput, { target: { value: "testuser" } });
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password1" } });
    fireEvent.change(repeatPasswordInput, { target: { value: "password2" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith("Please repeat the password correctly");
      expect(axios.post).not.toHaveBeenCalled();
    });

    alertMock.mockRestore();
  });
});
