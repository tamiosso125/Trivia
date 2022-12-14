import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import md5 from 'crypto-js/md5';
import Header from '../components/Header';
import QuestionCard from '../components/QuestionCard';
import { saveQuestions } from '../redux/actions';
import './Game.css';

class Game extends React.Component {
  constructor() {
    super();
    this.state = {
      loading: true,
      indexQuestions: 0,
      countTime: 30,
      isDisabled: false,
      showNextBtn: false,
      style: false,
      error: false,
      displayQuestions: false,
      interval: '',
    };
  }

  async componentDidMount() {
    const ONE_SECOND = 1000;
    this.fetchQuestions();
    // Aplicação do setInterval baseado na aula 12.1 do Gabriel Espindola
    // Código presente no link: https://github.com/tryber/sd-020-b-live-lectures/blob/lecture/12.1/trybem-estar/src/components/Timer.js
    this.setState({
      interval: setInterval(() => {
        this.setState((prev) => ({
          countTime: prev.countTime - 1,
        }), () => {
          const { countTime, interval } = this.state;
          if (countTime === 0) {
            this.setState({
              isDisabled: true,
              showNextBtn: true,
            }, () => clearInterval(interval));
          }
        });
      }, ONE_SECOND),
    });
  }

  prepareOptionsForQuestion = (datas) => datas.map((data) => {
    const { correct_answer: correctAnswer, incorrect_answers: incorrectAnswers } = data;
    const incorrectAnswersMap = incorrectAnswers
      .map((answer, index) => ({ type: false, answer, index }));
    const answers = [
      { type: true, answer: correctAnswer, index: null },
      ...incorrectAnswersMap,
    ];
      // Embaralhamentos dos elementos de um array proveniente da mentoria técnica com o instrutor Moisés Santana
      // link da referência utilizada: https://flaviocopes.com/how-to-shuffle-array-javascript/
      // Como o Math.random gera um número aleatório entre 0 e 0.99, reduzir 0.5 faz ele ser maior ou menor aleatoriamente resultando com comportamento do sort de ordenar em relação ao número retornado (ants ou depois)
    const HALF_NUMBER = 0.5;
    answers.sort(() => Math.random() - HALF_NUMBER);
    return { ...data, answers };
  })

  prepareURLWithFilters = () => {
    const { settings } = this.props;
    const emptyString = '';
    const categoryString = `&category=${settings.category}`;
    const difficultyString = `&difficulty=${settings.difficulty}`;
    const typeString = `&type=${settings.type}`;
    const checkCategory = settings.category !== '' ? categoryString : emptyString;
    const checkDifficulty = settings.difficulty !== '' ? difficultyString : emptyString;
    const checkType = settings.type !== '' ? typeString : emptyString;
    const URL = 'https://opentdb.com/api.php?amount=5';
    const changeURL = `${URL}${checkCategory}${checkDifficulty}${checkType}`;
    return changeURL;
  }

  fetchQuestions = async () => {
    this.setState({ loading: true }, async () => {
      const { settings } = this.props;
      const token = localStorage.getItem('token');
      const settingsChange = [
        settings.category !== '',
        settings.difficulty !== '',
        settings.type !== '',
      ];
      let URL = `https://opentdb.com/api.php?amount=5&token=${token}`;
      if (settingsChange.some((change) => change === true)) {
        URL = this.prepareURLWithFilters();
      }
      const response = await fetch(URL);
      const data = await response.json();
      const errorCode = 3;
      if (data.response_code === errorCode) {
        const { history } = this.props;
        localStorage.removeItem('token');
        history.push('/');
      } else if (data.response_code === 1 || data.response_code === 2) {
        this.setState({ error: true, loading: false, displayQuestions: false });
      } else {
        const { saveQuestionsStore } = this.props;
        const dataPrepare = this.prepareOptionsForQuestion(data.results);
        saveQuestionsStore(dataPrepare);
        this.setState({ loading: false, displayQuestions: true });
      }
    });
  }

  afterAnswer = () => {
    this.setState({
      isDisabled: true,
      showNextBtn: true,
      style: true,
    });
  }

  redirectButtonError = () => {
    const { history } = this.props;
    history.push('/settings');
  }

  nextQuestion = () => {
    const { indexQuestions, interval } = this.state;
    const maxQuestions = 4;
    if (indexQuestions === maxQuestions) {
      const { history, myName, email, myScore } = this.props;
      const actualRank = JSON.parse(localStorage.getItem('ranking')) || [];
      const result = {
        name: myName,
        picture: `https://www.gravatar.com/avatar/${md5(email)}`,
        score: myScore,
      };
      actualRank.push(result);
      localStorage.setItem('ranking', JSON.stringify(actualRank));
      // Necessita de um clearInterval para não deixar atualizando o tempo
      // quando o componente não estiver mais sendo renderizado
      clearInterval(interval);
      history.push('/feedback');
    } else {
      this.setState((prevState) => ({
        isDisabled: false,
        showNextBtn: false,
        countTime: 30,
        style: false,
        indexQuestions: prevState.indexQuestions + 1,
      }));
    }
  }

  render() {
    const {
      indexQuestions,
      loading,
      countTime,
      isDisabled,
      showNextBtn,
      style,
      error,
      displayQuestions,
    } = this.state;
    return (
      <section className="game-container">
        <Header />
        { error && (
          <div className="game-error">
            <h4>Error: Invalid Parameter</h4>
            <button
              type="button"
              onClick={ this.redirectButtonError }
              className="btn btn-info"
            >
              Change Settings
            </button>
          </div>
        )}
        { loading && <h4 className="game-loading">Loading...</h4> }
        { displayQuestions && <QuestionCard
          indexQuestions={ indexQuestions }
          countTime={ countTime }
          isDisabled={ isDisabled }
          afterAnswer={ this.afterAnswer }
          nextQuestion={ this.nextQuestion }
          showNextBtn={ showNextBtn }
          style={ style }
        /> }
      </section>
    );
  }
}

Game.propTypes = {
  history: PropTypes.shape({
    push: PropTypes.func,
  }).isRequired,
  saveQuestionsStore: PropTypes.func.isRequired,
  myName: PropTypes.string.isRequired,
  email: PropTypes.string.isRequired,
  myScore: PropTypes.number.isRequired,
  settings: PropTypes.objectOf(PropTypes.string).isRequired,
};

const mapStateToProps = (state) => ({
  myName: state.player.name,
  email: state.player.gravatarEmail,
  myScore: state.player.score,
  settings: state.game.settings,
});

const mapDispatchToProps = (dispatch) => ({
  saveQuestionsStore: (payload) => dispatch(saveQuestions(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Game);
